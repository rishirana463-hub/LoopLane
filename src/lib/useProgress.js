import { useCallback, useEffect, useRef, useState } from 'react';
import {
  STORAGE_KEY, VERSION, createProgress, normalizeProgress, refreshProgress,
  completeLesson, mergeProgress,
} from './progress.js';
import { supabase } from './supabase.js';

const SAVE_DELAY = 650;
const RETRY_INTERVAL = 30000;
const REQUEST_TIMEOUT = 20000;
const STORAGE_MESSAGE = 'Progress is available for this visit, but your browser could not save it on this device.';
const validOwner = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const finiteTime = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function browserStorage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

function normalizeSync(raw) {
  return {
    ownerId: validOwner(raw?.ownerId) ? raw.ownerId : null,
    pending: raw?.pending === true,
    revision: Math.min(Number.MAX_SAFE_INTEGER - 1, finiteTime(raw?.revision)),
    changedAt: finiteTime(raw?.changedAt),
    lastSyncedAt: finiteTime(raw?.lastSyncedAt),
  };
}

/** One versioned envelope: whitelisted progress plus durable sync metadata. */
export function readProgressEnvelope(storage = browserStorage(), now = Date.now()) {
  try {
    if (!storage) return { progress: refreshProgress(createProgress(now), now), sync: normalizeSync(), error: STORAGE_MESSAGE };
    const text = storage.getItem(STORAGE_KEY);
    const raw = text ? JSON.parse(text) : null;
    const progress = refreshProgress(normalizeProgress(raw, now), now);
    const sync = normalizeSync(raw?.version === VERSION ? raw.sync : null);
    if (raw?.version === VERSION && !equal(progress, normalizeProgress(raw, now))) sync.pending = true;
    return { progress, sync, error: null };
  } catch {
    return { progress: refreshProgress(createProgress(now), now), sync: normalizeSync(), error: STORAGE_MESSAGE };
  }
}

/** Local-first state. Optional dependencies make storage and cloud races testable. */
export function useProgress({ client = supabase, storage = browserStorage() } = {}) {
  const storageRef = useRef(storage);
  const [initial] = useState(() => readProgressEnvelope(storageRef.current));
  const [progress, setProgress] = useState(initial.progress);
  const [session, setSession] = useState(null);
  const [syncStatus, setSyncStatus] = useState('guest');
  const [storageError, setStorageError] = useState(initial.error);
  const [authError, setAuthError] = useState(null);
  const progressRef = useRef(initial.progress);
  const metadataRef = useRef(initial.sync);
  const sessionRef = useRef(null);
  const mountedRef = useRef(false);
  const epochRef = useRef(0);
  const loadedUserRef = useRef(null);
  const taskRef = useRef(null);
  const saveTimerRef = useRef(null);
  const syncRunnerRef = useRef(null);

  const writeDisk = useCallback(() => {
    try {
      if (!storageRef.current) throw new Error('Storage unavailable');
      storageRef.current.setItem(STORAGE_KEY, JSON.stringify({ ...progressRef.current, sync: metadataRef.current }));
      if (mountedRef.current) setStorageError(null);
    } catch {
      if (mountedRef.current) setStorageError(STORAGE_MESSAGE);
    }
  }, []);

  const queueSync = useCallback((delay = SAVE_DELAY) => {
    if (!mountedRef.current || !sessionRef.current?.user?.id || !client) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void syncRunnerRef.current?.(); }, delay);
  }, [client]);

  const commit = useCallback((candidate, { ownerId, forcePending = false } = {}) => {
    const next = normalizeProgress(candidate);
    const changed = !equal(next, progressRef.current);
    const ownerChanged = ownerId !== undefined && ownerId !== metadataRef.current.ownerId;
    if (changed || ownerChanged || forcePending) {
      metadataRef.current = {
        ...metadataRef.current,
        ...(ownerId !== undefined ? { ownerId } : {}),
        pending: true,
        revision: metadataRef.current.revision + 1,
        changedAt: Math.max(Date.now(), metadataRef.current.changedAt + 1),
      };
      progressRef.current = next;
      if (mountedRef.current) setProgress(next);
      writeDisk();
    }
    if (sessionRef.current?.user?.id && metadataRef.current.pending) {
      if (mountedRef.current) setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'pending');
      queueSync();
    }
    return next;
  }, [queueSync, writeDisk]);

  const updateProgress = useCallback(value => {
    // Hand callers a copy so even an accidental mutation cannot change a
    // snapshot currently being sent to the cloud.
    const current = normalizeProgress(progressRef.current);
    const next = typeof value === 'function' ? value(current) : { ...current, ...value };
    return commit(next ?? current);
  }, [commit]);

  const complete = useCallback(details => {
    const result = completeLesson(progressRef.current, details);
    result.progress = commit(result.progress);
    return result;
  }, [commit]);

  const cancelRequest = useCallback(() => {
    epochRef.current += 1;
    loadedUserRef.current = null;
    taskRef.current?.controller.abort();
    taskRef.current = null;
    clearTimeout(saveTimerRef.current);
  }, []);

  const acceptSession = useCallback(nextSession => {
    if (!mountedRef.current) return;
    const previousId = sessionRef.current?.user?.id || null;
    const userId = nextSession?.user?.id || null;
    sessionRef.current = nextSession;
    setSession(nextSession);
    if (userId) setAuthError(null);
    if (userId !== previousId) {
      cancelRequest();
      if (userId) {
        // A shared device must not silently donate one account's progress to
        // another account. Unclaimed guest data is merged on first sign-in.
        const ownedByAnother = metadataRef.current.ownerId && metadataRef.current.ownerId !== userId;
        commit(ownedByAnother ? createProgress() : progressRef.current, { ownerId: userId, forcePending: true });
      }
    }
    if (userId) queueSync(0);
    else setSyncStatus('guest');
  }, [cancelRequest, commit, queueSync]);

  const syncNow = useCallback(async () => {
    const userId = sessionRef.current?.user?.id;
    if (!client || !userId || !mountedRef.current || taskRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncStatus('offline');
      return;
    }
    if (loadedUserRef.current === userId && !metadataRef.current.pending) {
      setSyncStatus('synced');
      return;
    }
    const task = { controller: new AbortController(), epoch: epochRef.current, userId };
    taskRef.current = task;
    const isCurrent = () => mountedRef.current && taskRef.current === task && epochRef.current === task.epoch && sessionRef.current?.user?.id === userId;
    const timeout = setTimeout(() => task.controller.abort(), REQUEST_TIMEOUT);
    let sendAgain = false;
    setSyncStatus('syncing');
    try {
      if (loadedUserRef.current !== userId) {
        const { data, error } = await client.from('progress').select('data').eq('user_id', userId).maybeSingle().abortSignal(task.controller.signal);
        if (!isCurrent()) return;
        if (error) throw error;
        // Read the current ref after the request: an answer given while the
        // remote row was loading must be included in the merged result.
        const merged = data?.data ? mergeProgress(progressRef.current, data.data) : refreshProgress(progressRef.current);
        commit(merged, { ownerId: userId, forcePending: true });
        loadedUserRef.current = userId;
      }
      if (!isCurrent()) return;
      const revision = metadataRef.current.revision;
      const payload = normalizeProgress(progressRef.current);
      const { data, error } = await client.from('progress')
        .upsert({ user_id: userId, data: payload }, { onConflict: 'user_id' })
        .select('user_id').single().abortSignal(task.controller.signal);
      if (!isCurrent()) return;
      if (error) throw error;
      if (data?.user_id !== userId) throw new Error('The cloud save was not confirmed.');
      if (metadataRef.current.revision === revision) {
        metadataRef.current = { ...metadataRef.current, pending: false, lastSyncedAt: Date.now() };
        writeDisk();
        setSyncStatus('synced');
      } else {
        // The acknowledged snapshot is older than the current answers. Keep
        // the durable pending flag and serialize a second save.
        sendAgain = true;
        setSyncStatus('pending');
      }
    } catch {
      if (!isCurrent()) return;
      metadataRef.current = { ...metadataRef.current, pending: true };
      writeDisk();
      setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
    } finally {
      clearTimeout(timeout);
      if (taskRef.current === task) taskRef.current = null;
      if (sendAgain && mountedRef.current) queueSync(0);
    }
  }, [client, commit, queueSync, writeDisk]);
  syncRunnerRef.current = syncNow;

  useEffect(() => {
    mountedRef.current = true;
    writeDisk();
    let alive = true;
    let authEventRevision = 0;
    let subscription;
    if (client) {
      // This callback stays synchronous. Supabase calls are deferred through
      // queueSync, outside the auth callback's internal lock.
      const listener = client.auth.onAuthStateChange((_event, nextSession) => {
        if (!alive) return;
        authEventRevision += 1;
        acceptSession(nextSession);
      });
      subscription = listener.data.subscription;
      const beforeRequest = authEventRevision;
      void client.auth.getSession().then(({ data, error }) => {
        if (!alive || !mountedRef.current || authEventRevision !== beforeRequest) return;
        if (error) setAuthError(error.message || 'We could not restore your account. Guest learning is available.');
        else acceptSession(data.session);
      }).catch(() => {
        if (alive && mountedRef.current && authEventRevision === beforeRequest) setAuthError('We could not restore your account. Guest learning is available.');
      });
    }
    const refresh = () => { updateProgress(current => refreshProgress(current)); queueSync(0); };
    const online = () => queueSync(0);
    const refreshTimer = setInterval(refresh, 60000);
    const retryTimer = setInterval(() => { void syncRunnerRef.current?.(); }, RETRY_INTERVAL);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', online);
    return () => {
      alive = false;
      mountedRef.current = false;
      subscription?.unsubscribe();
      clearInterval(refreshTimer);
      clearInterval(retryTimer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', online);
      cancelRequest();
    };
  }, [acceptSession, cancelRequest, client, queueSync, updateProgress, writeDisk]);

  const signOut = useCallback(async () => {
    if (!client) return { error: null };
    const previousId = sessionRef.current?.user?.id;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      if (mountedRef.current) setAuthError(null);
      if (sessionRef.current?.user?.id === previousId) acceptSession(null);
      return { error: null };
    } catch (error) {
      if (mountedRef.current) setAuthError(error.message || 'Sign out did not finish. Please try again.');
      return { error };
    }
  }, [acceptSession, client]);

  return { progress, updateProgress, complete, session, syncStatus, storageError, authError, signOut };
}

export default useProgress;
