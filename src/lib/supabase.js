import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();

function configurationError() {
  if (!url || !key) return 'Cloud accounts are not connected yet. You can keep learning as a guest.';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
      return 'Cloud accounts need a valid Supabase project URL. Guest learning is available.';
    }
  } catch {
    return 'The cloud project URL is invalid. Guest learning is available.';
  }
  if (key.startsWith('sb_secret_')) return 'The cloud key must be a public browser key. Guest learning is available.';
  // Catch a legacy service-role key before using it. Public build variables must
  // still be reviewed before deployment; this check cannot hide a bundled key.
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'service_role') return 'The cloud key must be a public browser key. Guest learning is available.';
    } catch {
      return 'The cloud key is invalid. Guest learning is available.';
    }
  }
  return null;
}

export const authConfigError = configurationError();
export const authConfigured = authConfigError === null;
export const authConfig = { configured: authConfigured, error: authConfigError };

// SDK session tokens use Supabase's own storage entry. Learning progress and
// its retry metadata use only progress.STORAGE_KEY, managed by useProgress.
export const supabase = authConfigured ? createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Recovery exchanges its code explicitly so an invalid link cannot reuse an old login.
    detectSessionInUrl: typeof window === 'undefined' || window.location.pathname !== '/reset-password',
    flowType: 'pkce',
  },
}) : null;

export function authRedirectURL() {
  return typeof window === 'undefined' ? undefined : new URL('/', window.location.origin).href;
}

/** Bind sensitive updates to the verified recovery session, even across account switches. */
export async function updatePasswordForSession(session, password) {
  const isolated = createClient(url, key, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
    storageKey: `looplane-recovery-${crypto.randomUUID()}`,
  } });
  try {
    const { data, error } = await isolated.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (error || data.session?.user?.id !== session.user.id) return { data: { user: null }, error: error || new Error('The recovery session ended. Request a new reset link.') };
    return await isolated.auth.updateUser({ password });
  } finally { await isolated.auth.dispose(); }
}
