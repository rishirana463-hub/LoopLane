import { useEffect, useRef, useState } from 'react';
import { supabase, authConfigured, authConfigError, authRedirectURL } from '../lib/supabase.js';
import { passwordRecoveryURL } from '../lib/accountSupport.js';

const resetNotice = 'If an account uses this email, a reset link is on its way. Open it in the same browser where you requested it.';

const syncLabels = {
  guest: 'Saved on this device', pending: 'Changes waiting to sync', syncing: 'Syncing your progress…',
  synced: 'Progress is up to date', offline: 'Offline · we will retry when connected',
  error: 'Cloud save delayed · we will retry automatically',
};

export default function AccountDialog({ onClose, session, syncStatus, signOut, offlineReady, initialMode = 'signup', client = supabase }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const panelRef = useRef(null);
  const emailRef = useRef(null);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const showAccount = Boolean(session) && mode !== 'reset';

  useEffect(() => {
    aliveRef.current = true;
    const previous = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector('input, button, a')?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab' || !panel) return;
      const controls = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { aliveRef.current = false; document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, []);

  useEffect(() => {
    if (emailRef.current) emailRef.current.focus();
    else panelRef.current?.querySelector('button')?.focus();
  }, [mode]);

  function switchMode(nextMode) {
    if (busyRef.current) return;
    setMode(nextMode); setPassword(''); setError(''); setNotice('');
  }

  async function submit(event) {
    event.preventDefault();
    if (busyRef.current || !client) return;
    busyRef.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'reset') {
        const result = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: passwordRecoveryURL() });
        if (result.error) throw result.error;
        if (aliveRef.current) setNotice(resetNotice);
        return;
      }
      const credentials = { email: email.trim(), password };
      const result = mode === 'signup'
        ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: authRedirectURL() } })
        : await client.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (!aliveRef.current) return;
      setPassword('');
      if (result.data.session) closeRef.current();
      else setNotice('Check your inbox to confirm your email. Open the link in this browser, then sign in.');
    } catch (caught) {
      if (!aliveRef.current) return;
      if (mode !== 'reset') setError(caught.message || 'We could not finish signing in. Please try again.');
      else if (caught.code === 'user_not_found') setNotice(resetNotice);
      else if (caught.status === 429 || caught.code === 'over_email_send_rate_limit') setError('Too many reset requests. Wait a few minutes and try again.');
      else setError('We could not send a reset link. Check your connection and try again. If this continues, contact support.');
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  }

  async function googleSignIn() {
    if (busyRef.current || !client) return;
    busyRef.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: oauthError } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirectURL(), queryParams: { prompt: 'select_account' } } });
      if (oauthError) throw oauthError;
    } catch (caught) {
      if (aliveRef.current) setError(caught.message || 'Google sign-in is unavailable. Please try email instead.');
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  }

  async function leaveAccount() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError('');
    try {
      const result = await signOut();
      if (result?.error) throw result.error;
      if (aliveRef.current) closeRef.current();
    } catch (caught) {
      if (aliveRef.current) setError(caught.message || 'Sign out did not finish. Please try again.');
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title" ref={panelRef}>
        <button type="button" className="modal-close" aria-label="Close account dialog" onClick={onClose}>×</button>
        <span className="eyebrow">Your next chapter</span>
        <h2 id="account-title">{showAccount ? 'Your Looplane account' : mode === 'reset' ? 'Reset your password' : 'Take your progress with you.'}</h2>
        {offlineReady && <p className="offline-note account-offline-note" role="status">Lessons are ready offline</p>}
        {showAccount ? (
          <>
            <p>Signed in as <strong>{session.user.email || 'your Google account'}</strong>.</p>
            <p className="account-sync" role="status">{syncLabels[syncStatus] || syncLabels.pending}</p>
            <p className="muted">Signing out keeps this device’s progress. Another account loads its own progress.</p>
            <button type="button" className="button secondary" disabled={busy} onClick={leaveAccount}>{busy ? 'Signing out…' : 'Sign out'}</button>
          </>
        ) : !authConfigured ? (
          <>
            <p>{authConfigError}</p>
            <p className="muted">Your lessons, XP, and streak can still be saved in this browser.</p>
            <button type="button" className="button" onClick={onClose}>Keep learning</button>
          </>
        ) : (
          <>
            <p>{mode === 'reset' ? 'Enter your account email to request a password reset link.' : 'Save your streak and pick up where you left off on another device.'}</p>
            {mode !== 'reset' && <div className="account-tabs" role="group" aria-label="Account action">
              <button type="button" className={`button ${mode === 'signup' ? '' : 'secondary'}`} disabled={busy} aria-pressed={mode === 'signup'} onClick={() => switchMode('signup')}>Create account</button>
              <button type="button" className={`button ${mode === 'signin' ? '' : 'secondary'}`} disabled={busy} aria-pressed={mode === 'signin'} onClick={() => switchMode('signin')}>Sign in</button>
            </div>}
            <form onSubmit={submit} className="account-form">
              <label className="field">Email
                <input ref={emailRef} name="email" type="email" required autoComplete="email" maxLength={254} disabled={busy} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              {mode !== 'reset' && <label className="field">Password
                <input name="password" type="password" required minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} disabled={busy} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} />
              </label>}
              <button className="button" type="submit" disabled={busy}>{busy ? (mode === 'reset' ? 'Sending reset link…' : 'One moment…') : mode === 'reset' ? 'Send reset link' : mode === 'signup' ? 'Create my account' : 'Sign in'}</button>
            </form>
            {mode === 'signin' && <button type="button" className="button secondary" disabled={busy} onClick={() => switchMode('reset')}>Forgot password?</button>}
            {mode === 'reset' ? <button type="button" className="button secondary" disabled={busy} onClick={() => switchMode('signin')}>Back to sign in</button> : <>
              <div className="account-divider"><span>or</span></div>
              <button type="button" className="button secondary google-signin" disabled={busy} onClick={googleSignIn}><span aria-hidden="true">G</span> Continue with Google</button>
            </>}
          </>
        )}
        {notice && <p className="account-notice" role="status">{notice}</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
        <p className="account-support-links"><a href="/delete-account">Request account deletion</a></p>
        <p className="account-privacy muted">Guest progress stays in this browser. Account progress is stored securely with Supabase. <a href="/privacy">Read our privacy notice</a>.</p>
      </section>
    </div>
  );
}
