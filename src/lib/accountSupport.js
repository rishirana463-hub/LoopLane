export const SUPPORT_EMAIL = 'rishirana463@gmail.com';
export const RECOVERY_KEY = 'looplane.password-recovery.v1';
const RECOVERY_WINDOW = 30 * 60 * 1000;
const LINK_ERROR = 'This reset link has expired or cannot be verified. Request a new link and open it in the same browser.';
const fallbackRecovery = new Map();
function recoveryError() { return Object.assign(new Error(LINK_ERROR), { code: 'RECOVERY_REQUIRED' }); }

export function passwordRecoveryURL(origin = typeof window === 'undefined' ? undefined : window.location.origin) {
  return origin ? new URL('/reset-password', origin).href : undefined;
}

export function deletionRequestURL(email = '') {
  const body = `Please delete my Looplane account and its cloud learning progress.\n\nAccount email: ${email || '[Your Looplane account email]'}\n\nI understand this removes my account and synced progress permanently. Please verify my account ownership before deleting it.\n\nDo not include passwords or verification codes.`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Looplane account deletion request')}&body=${encodeURIComponent(body)}`;
}

export function recoveryStorage() {
  return {
    getItem(key) { try { return window.sessionStorage.getItem(key) ?? fallbackRecovery.get(key) ?? null; } catch { return fallbackRecovery.get(key) ?? null; } },
    setItem(key, value) { fallbackRecovery.set(key, value); try { window.sessionStorage.setItem(key, value); } catch { /* Memory supports the current visit. */ } },
    removeItem(key) { fallbackRecovery.delete(key); try { window.sessionStorage.removeItem(key); } catch { /* No durable copy is accessible. */ } },
  };
}

export function clearRecovery(storage) {
  try { storage?.removeItem(RECOVERY_KEY); } catch { /* Private browsing can deny storage. */ }
}

function rememberedUser(storage, now) {
  try {
    const marker = JSON.parse(storage?.getItem(RECOVERY_KEY) || 'null');
    return typeof marker?.userId === 'string' && Number.isFinite(marker.expiresAt)
      && marker.expiresAt > now && marker.expiresAt <= now + RECOVERY_WINDOW ? marker.userId : null;
  } catch { return null; }
}

/** Recovery codes are exchanged explicitly; an existing login is never a substitute. */
export async function recoverPasswordSession({ client, href, storage, replaceURL = () => {}, now = Date.now() }) {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('code');
  let expectedId = rememberedUser(storage, now);
  let recoveryId = null;
  const listener = client?.auth.onAuthStateChange((event, session) => {
    // Keep this callback synchronous: the Auth client holds its internal lock.
    if (event === 'PASSWORD_RECOVERY') recoveryId = session?.user?.id || null;
  });
  try {
    if (!client || url.searchParams.has('error') || url.searchParams.has('error_code')
      || fragment.has('error') || fragment.has('error_code')) throw new Error(LINK_ERROR);
    if (code) {
      clearRecovery(storage);
      const flowId = url.searchParams.get('sb_flow_id');
      const { data, error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
      if (error || !data?.session || !data.user?.id || recoveryId !== data.user.id) throw new Error(LINK_ERROR);
      expectedId = data.user.id;
    }
    if (!expectedId) throw new Error(LINK_ERROR);
    const { data, error } = await client.auth.getUser();
    if (error || data?.user?.id !== expectedId) throw new Error(LINK_ERROR);
    if (code) {
      try { storage?.setItem(RECOVERY_KEY, JSON.stringify({ userId: expectedId, expiresAt: now + RECOVERY_WINDOW })); } catch { /* The current visit still works. */ }
    }
    return data.user;
  } catch {
    clearRecovery(storage);
    throw recoveryError();
  } finally {
    listener?.data.subscription.unsubscribe();
    // Remove codes and error details from history after the exchange, including failures.
    replaceURL('/reset-password');
  }
}

export function passwordValidation(password, confirmation) {
  if (password.length < 8) return 'Use at least 8 characters for your new password.';
  if (password !== confirmation) return 'The passwords do not match. Enter the same password twice.';
  return '';
}

export async function updateRecoveredPassword({ client, userId, password, confirmation, storage, writePassword, isCurrent = () => true, now = Date.now() }) {
  const validation = passwordValidation(password, confirmation);
  if (validation) throw new Error(validation);
  if (!userId || rememberedUser(storage, now) !== userId || !isCurrent()) {
    clearRecovery(storage);
    throw recoveryError();
  }
  const snapshot = await client.auth.getSession();
  const session = snapshot.data?.session;
  if (snapshot.error || session?.user?.id !== userId || !session.access_token || !isCurrent()) throw recoveryError();
  const { data, error } = await client.auth.getUser(session.access_token);
  if (error || data?.user?.id !== userId || !isCurrent() || rememberedUser(storage, Date.now()) !== userId) {
    clearRecovery(storage);
    throw recoveryError();
  }
  // The writer uses this exact verified session, not a mutable shared login.
  const result = await writePassword(session, password);
  if (result.error) throw result.error;
  if (result.data?.user?.id !== userId) throw new Error('The password change was not confirmed. Please try again.');
  clearRecovery(storage);
}
