import { useEffect, useRef, useState } from 'react';
import { supabase, updatePasswordForSession } from '../lib/supabase.js';
import { clearRecovery, recoverPasswordSession, recoveryStorage, updateRecoveredPassword } from '../lib/accountSupport.js';

export default function PasswordRecovery({ client = supabase, writePassword = updatePasswordForSession }) {
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const storage = useRef(recoveryStorage());
  const initialHref = useRef(window.location.href);
  const request = useRef(null);
  const alive = useRef(false);
  const busy = useRef(false);
  const userId = useRef(null);
  const heading = useRef(null);

  useEffect(() => {
    alive.current = true;
    const subscription = client?.auth.onAuthStateChange((event, session) => {
      if (userId.current && (event === 'SIGNED_OUT' || session?.user?.id !== userId.current)) {
        userId.current = null;
        clearRecovery(storage.current);
        if (alive.current) { setPassword(''); setConfirmation(''); setStatus('invalid'); }
      }
    });
    request.current ||= recoverPasswordSession({
      client, href: initialHref.current, storage: storage.current,
      replaceURL: path => window.history.replaceState(null, '', path),
    });
    request.current.then(recovered => {
      if (!alive.current) return;
      userId.current = recovered.id;
      setUser(recovered); setStatus('ready');
    }).catch(caught => {
      if (alive.current) { setError(caught.message); setStatus('invalid'); }
    });
    return () => { alive.current = false; subscription?.data.subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => { heading.current?.focus(); }, [status]);

  async function submit(event) {
    event.preventDefault();
    if (busy.current || status !== 'ready') return;
    busy.current = true; setStatus('saving'); setError('');
    const expectedId = userId.current;
    try {
      await updateRecoveredPassword({ client, userId: expectedId, password, confirmation, storage: storage.current,
        writePassword, isCurrent: () => alive.current && userId.current === expectedId });
      if (!alive.current || userId.current !== expectedId) return;
      setPassword(''); setConfirmation(''); setStatus('success');
    } catch (caught) {
      if (alive.current && userId.current === expectedId) {
        setError(caught.message || 'The password could not be changed. Reconnect and try again.');
        if (caught.code === 'RECOVERY_REQUIRED') { userId.current = null; setPassword(''); setConfirmation(''); setStatus('invalid'); }
        else setStatus('ready');
      }
    } finally { busy.current = false; }
  }

  function leave() { clearRecovery(storage.current); }

  return <main className="account-support-page">
    <a className="brand" href="/" onClick={leave}><img src="/logo.svg" alt="" />looplane</a>
    <section className="account-support-panel">
      <h1 ref={heading} tabIndex={-1}>{status === 'success' ? 'Password updated' : 'Reset your password'}</h1>
      {status === 'checking' ? <p role="status">Checking your reset link…</p>
        : status === 'invalid' ? <><p role="alert">{error || 'Your recovery session ended. Request a new reset link.'}</p><a className="button" href="/?account=reset" onClick={leave}>Request a new link</a></>
          : status === 'success' ? <><p role="status">Your new password is saved. You can keep learning with this account.</p><a className="button" href="/" onClick={leave}>Back to learning</a></>
            : <>
              <p>Choose a new password for <strong>{user?.email || 'your account'}</strong>.</p>
              <form className="account-form" onSubmit={submit}>
                <label className="field">New password<input name="new-password" type="password" autoComplete="new-password" minLength={8} required disabled={status === 'saving'} value={password} onChange={event => setPassword(event.target.value)} aria-describedby="password-help" /></label>
                <p id="password-help" className="muted">Use at least 8 characters. Password managers and paste are supported.</p>
                <label className="field">Confirm new password<input name="confirm-password" type="password" autoComplete="new-password" minLength={8} required disabled={status === 'saving'} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
                {error && <p className="account-error" role="alert">{error}</p>}
                <button className="button" disabled={status === 'saving'} aria-busy={status === 'saving'}>{status === 'saving' ? 'Saving password…' : 'Save new password'}</button>
              </form>
              <a className="text-button" href="/" onClick={leave}>Cancel and return</a>
            </>}
      <a className="account-support-link" href="/delete-account" onClick={leave}>Request account deletion</a>
    </section>
  </main>;
}
