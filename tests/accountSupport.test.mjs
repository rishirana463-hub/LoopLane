import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECOVERY_KEY,
  SUPPORT_EMAIL,
  clearRecovery,
  deletionRequestURL,
  passwordRecoveryURL,
  passwordValidation,
  recoveryStorage,
  recoverPasswordSession,
  updateRecoveredPassword,
} from '../src/lib/accountSupport.js';

const NOW = Date.UTC(2026, 9, 16, 12);
const WINDOW = 30 * 60 * 1000;
const USER = 'recovering-user';
const LINK = 'https://looplane.example/reset-password?code=single-use-code';
const LINK_ERROR = /expired or cannot be verified/i;

function storageWith(raw) {
  const entries = new Map(raw === undefined ? [] : [[RECOVERY_KEY, raw]]);
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: key => entries.delete(key),
  };
}

function activeStorage(userId = USER, expiresAt = NOW + WINDOW) {
  return storageWith(JSON.stringify({ userId, expiresAt }));
}

// The fake Auth API models server success/failure and emits actual Auth event names.
// It never infers recovery authorization from an already signed-in session.
function authClient({
  event = 'PASSWORD_RECOVERY',
  eventUserId = USER,
  currentUserId = USER,
  exchangeError = null,
  userError = null,
  updateError = null,
  updatedUserId = USER,
  sessionUserId = USER,
  sessionError = null,
} = {}) {
  let listener;
  const calls = { exchange: [], getSession: 0, getUser: 0, userTokens: [], updates: [], passwordSessions: [], unsubscribe: 0 };
  const session = sessionUserId ? { user: { id: sessionUserId }, access_token: 'recovery-access-token', refresh_token: 'recovery-refresh-token' } : null;
  const client = {
    auth: {
      onAuthStateChange(callback) {
        listener = callback;
        return { data: { subscription: { unsubscribe() { calls.unsubscribe += 1; } } } };
      },
      async exchangeCodeForSession(code, options) {
        calls.exchange.push({ code, options });
        if (exchangeError) return { data: { user: null, session: null }, error: exchangeError };
        listener?.(event, { user: { id: eventUserId } });
        return { data: { user: { id: USER }, session: { user: { id: USER } } }, error: null };
      },
      async getSession() {
        calls.getSession += 1;
        return { data: { session }, error: sessionError };
      },
      async getUser(token) {
        calls.getUser += 1;
        calls.userTokens.push(token);
        return { data: { user: currentUserId ? { id: currentUserId } : null }, error: userError };
      },
      async updateUser() { assert.fail('Password recovery must not write through a mutable shared session'); },
    },
  };
  const writePassword = async (verifiedSession, password) => {
    calls.passwordSessions.push(verifiedSession);
    calls.updates.push({ password });
    return { data: { user: updatedUserId ? { id: updatedUserId } : null }, error: updateError };
  };
  return { client, calls, writePassword, session };
}

async function recover(harness = authClient(), options = {}) {
  const storage = options.storage ?? storageWith();
  const replaced = [];
  const result = await recoverPasswordSession({
    client: harness.client,
    href: LINK,
    storage,
    now: NOW,
    replaceURL: value => replaced.push(value),
    ...options,
  });
  return { result, storage, replaced, calls: harness.calls };
}

test('reset requests return to the password route on the current deployment', () => {
  assert.equal(passwordRecoveryURL('https://looplane.example/a/b'), 'https://looplane.example/reset-password');
  assert.equal(passwordRecoveryURL('http://localhost:5173'), 'http://localhost:5173/reset-password');
});

test('a verified PKCE recovery exchange authorizes the same server-verified user', async () => {
  const { result, storage, replaced, calls } = await recover();
  assert.equal(result.id, USER);
  assert.deepEqual(calls.exchange, [{ code: 'single-use-code', options: undefined }]);
  assert.equal(calls.getUser, 1);
  assert.equal(calls.unsubscribe, 1);
  assert.deepEqual(replaced, ['/reset-password']);
  assert.deepEqual(JSON.parse(storage.getItem(RECOVERY_KEY)), { userId: USER, expiresAt: NOW + WINDOW });
});

test('the flow ID from a recovery link is passed to its code exchange', async () => {
  const harness = authClient();
  await recover(harness, { href: `${LINK}&sb_flow_id=reset-flow-123` });
  assert.deepEqual(harness.calls.exchange, [{ code: 'single-use-code', options: { flowId: 'reset-flow-123' } }]);
});

test('a server-rejected expired code cannot reuse a previous recovery gate', async () => {
  const harness = authClient({ exchangeError: new Error('Token has expired') });
  const storage = activeStorage();
  const replaced = [];
  await assert.rejects(recover(harness, { storage, replaceURL: value => replaced.push(value) }), LINK_ERROR);
  assert.equal(storage.getItem(RECOVERY_KEY), null);
  assert.equal(harness.calls.getUser, 0);
  assert.equal(harness.calls.unsubscribe, 1);
  assert.deepEqual(replaced, ['/reset-password']);
});

test('a consumed link fails on reuse even if the user remains signed in', async () => {
  const harness = authClient();
  const storage = storageWith();
  await recover(harness, { storage });
  harness.client.auth.exchangeCodeForSession = async () => ({ data: { user: null, session: null }, error: new Error('Code already used') });
  await assert.rejects(recover(harness, { storage }), LINK_ERROR);
  assert.equal(storage.getItem(RECOVERY_KEY), null);
});

test('a missing link is not replaced by an existing ordinary login', async () => {
  const harness = authClient();
  await assert.rejects(recover(harness, { href: 'https://looplane.example/reset-password' }), LINK_ERROR);
  assert.equal(harness.calls.exchange.length, 0);
  assert.equal(harness.calls.getUser, 0);
});

test('a code without its PKCE verifier fails even if another user is already signed in', async () => {
  const harness = authClient({ currentUserId: 'old-signed-in-user', exchangeError: new Error('PKCE code verifier missing') });
  await assert.rejects(recover(harness), LINK_ERROR);
  assert.equal(harness.calls.getUser, 0);
  assert.equal(harness.calls.updates.length, 0);
});

test('OAuth sign-in and initial-session events do not authorize a password reset', async t => {
  for (const event of ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED']) {
    await t.test(event, async () => {
      const harness = authClient({ event });
      const storage = storageWith();
      await assert.rejects(recover(harness, { storage }), LINK_ERROR);
      assert.equal(storage.getItem(RECOVERY_KEY), null);
      assert.equal(harness.calls.getUser, 0);
    });
  }
});

test('a PASSWORD_RECOVERY event for another user is rejected', async () => {
  const harness = authClient({ eventUserId: 'another-recovering-user' });
  await assert.rejects(recover(harness), LINK_ERROR);
  assert.equal(harness.calls.getUser, 0);
});

test('an account changed between code exchange and server verification is rejected', async () => {
  const harness = authClient({ currentUserId: 'another-signed-in-user' });
  const storage = storageWith();
  await assert.rejects(recover(harness, { storage }), LINK_ERROR);
  assert.equal(storage.getItem(RECOVERY_KEY), null);
});

test('reloading a verified reset page works only for the same user within the recovery window', async () => {
  const harness = authClient();
  const storage = activeStorage();
  const { result } = await recover(harness, { storage, href: 'https://looplane.example/reset-password' });
  assert.equal(result.id, USER);
  assert.equal(harness.calls.exchange.length, 0);
  assert.equal(harness.calls.getUser, 1);
  assert.equal(JSON.parse(storage.getItem(RECOVERY_KEY)).expiresAt, NOW + WINDOW, 'Reloading must not extend recovery indefinitely');
});

test('expired, malformed and implausible recovery markers cannot authorize reloads', async t => {
  const markers = [
    ['expired', JSON.stringify({ userId: USER, expiresAt: NOW - 1 })],
    ['expiry boundary', JSON.stringify({ userId: USER, expiresAt: NOW })],
    ['invalid JSON', '{broken'],
    ['missing expiry', JSON.stringify({ userId: USER })],
    ['wrong expiry type', JSON.stringify({ userId: USER, expiresAt: String(NOW + WINDOW) })],
    ['wrong user type', JSON.stringify({ userId: {}, expiresAt: NOW + WINDOW })],
    ['implausible lifetime', JSON.stringify({ userId: USER, expiresAt: NOW + WINDOW + 1 })],
  ];
  for (const [name, raw] of markers) {
    await t.test(name, async () => {
      const storage = storageWith(raw);
      await assert.rejects(recover(authClient(), { storage, href: 'https://looplane.example/reset-password' }), LINK_ERROR);
      assert.equal(storage.getItem(RECOVERY_KEY), null);
    });
  }
});

test('changing accounts after a reset-page reload invalidates the recovery gate', async () => {
  const harness = authClient({ currentUserId: 'different-user' });
  const storage = activeStorage();
  await assert.rejects(recover(harness, { storage, href: 'https://looplane.example/reset-password' }), LINK_ERROR);
  assert.equal(storage.getItem(RECOVERY_KEY), null);
});

test('link error parameters cannot fall back to an otherwise valid local gate', async t => {
  for (const suffix of ['?error=access_denied', '?error_code=otp_expired', '#error=access_denied', '#error_code=otp_expired']) {
    await t.test(suffix, async () => {
      const storage = activeStorage();
      await assert.rejects(recover(authClient(), { storage, href: `https://looplane.example/reset-password${suffix}` }), LINK_ERROR);
      assert.equal(storage.getItem(RECOVERY_KEY), null);
    });
  }
});

test('Auth verification failures are rejected and recovery history is cleaned', async () => {
  const harness = authClient({ userError: new Error('Network failed') });
  const storage = activeStorage();
  const replaced = [];
  await assert.rejects(recover(harness, { storage, replaceURL: value => replaced.push(value) }), LINK_ERROR);
  assert.equal(storage.getItem(RECOVERY_KEY), null);
  assert.equal(harness.calls.unsubscribe, 1);
  assert.deepEqual(replaced, ['/reset-password']);
});

test('denied session storage does not crash a verified visit or grant later reload access', async () => {
  const storage = {
    getItem() { throw new Error('Storage denied'); },
    setItem() { throw new Error('Storage denied'); },
    removeItem() { throw new Error('Storage denied'); },
  };
  assert.equal((await recover(authClient(), { storage })).result.id, USER);
  await assert.rejects(recover(authClient(), { storage, href: 'https://looplane.example/reset-password' }), LINK_ERROR);
  assert.doesNotThrow(() => clearRecovery(storage));
});

test('the storage adapter supports a verified current visit when browser storage is unavailable', async t => {
  t.mock.method(Date, 'now', () => NOW);
  const storage = recoveryStorage();
  clearRecovery(storage);
  try {
    const harness = authClient();
    await recover(harness, { storage });
    await updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-password', confirmation: 'new-password', storage });
    assert.equal(harness.calls.updates.length, 1);
    assert.equal(storage.getItem(RECOVERY_KEY), null);
  } finally { clearRecovery(storage); }
});

test('weak and mismatched passwords are blocked before any Auth API call', async t => {
  for (const [password, confirmation, expected] of [
    ['', '', /at least 8/i],
    ['short', 'short', /at least 8/i],
    ['new-password', 'different-password', /do not match/i],
  ]) {
    await t.test(expected.source, async () => {
      const harness = authClient();
      await assert.rejects(updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password, confirmation, storage: activeStorage() }), expected);
      assert.equal(harness.calls.getUser, 0);
      assert.deepEqual(harness.calls.updates, []);
    });
  }
  assert.equal(passwordValidation('eightchr', 'eightchr'), '');
});

test('successful password changes are verified by Auth and consume the recovery gate', async t => {
  t.mock.method(Date, 'now', () => NOW);
  const harness = authClient();
  const storage = activeStorage();
  await updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-private-password', confirmation: 'new-private-password', storage });
  assert.equal(harness.calls.getSession, 1);
  assert.equal(harness.calls.getUser, 1);
  assert.deepEqual(harness.calls.userTokens, ['recovery-access-token']);
  assert.deepEqual(harness.calls.updates, [{ password: 'new-private-password' }]);
  assert.strictEqual(harness.calls.passwordSessions[0], harness.session, 'The writer receives the same session whose token was verified');
  assert.equal(storage.getItem(RECOVERY_KEY), null);
});

test('a changed or missing account cannot submit a recovered password', async t => {
  t.mock.method(Date, 'now', () => NOW);
  for (const currentUserId of ['another-user', null]) {
    await t.test(String(currentUserId), async () => {
      const harness = authClient({ currentUserId });
      const storage = activeStorage();
      await assert.rejects(updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-password', confirmation: 'new-password', storage }), LINK_ERROR);
      assert.deepEqual(harness.calls.updates, []);
      assert.equal(storage.getItem(RECOVERY_KEY), null);
    });
  }
});

test('an account switch while server verification is pending cannot update the replacement session', async t => {
  t.mock.method(Date, 'now', () => NOW);
  const harness = authClient();
  let resolveVerification;
  let current = true;
  harness.client.auth.getUser = () => new Promise(resolve => { resolveVerification = resolve; });
  const operation = updateRecoveredPassword({
    client: harness.client,
    writePassword: harness.writePassword,
    userId: USER,
    password: 'new-password',
    confirmation: 'new-password',
    storage: activeStorage(),
    isCurrent: () => current,
  });
  await new Promise(resolve => queueMicrotask(resolve));
  assert.equal(typeof resolveVerification, 'function', 'Submission must reach the pending server verification');
  current = false;
  resolveVerification({ data: { user: { id: USER } }, error: null });
  await assert.rejects(operation, LINK_ERROR);
  assert.deepEqual(harness.calls.updates, []);
});

test('a reset form that expires during server verification cannot change the password', async t => {
  let clockNow = NOW;
  t.mock.method(Date, 'now', () => clockNow);
  const harness = authClient();
  let resolveVerification;
  harness.client.auth.getUser = () => new Promise(resolve => { resolveVerification = resolve; });
  const storage = activeStorage(USER, NOW + 1);
  const operation = updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-password', confirmation: 'new-password', storage });
  await new Promise(resolve => queueMicrotask(resolve));
  clockNow = NOW + 2;
  resolveVerification({ data: { user: { id: USER } }, error: null });
  await assert.rejects(operation, LINK_ERROR);
  assert.deepEqual(harness.calls.updates, []);
  assert.equal(storage.getItem(RECOVERY_KEY), null);
});

test('missing and rejected session snapshots cannot reach the password writer', async t => {
  t.mock.method(Date, 'now', () => NOW);
  for (const options of [{ sessionUserId: null }, { sessionUserId: 'different-user' }, { sessionError: new Error('Session unavailable') }]) {
    const harness = authClient(options);
    await assert.rejects(updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-password', confirmation: 'new-password', storage: activeStorage() }), LINK_ERROR);
    assert.equal(harness.calls.getUser, 0);
    assert.deepEqual(harness.calls.updates, []);
  }
});

test('a recovery gate must still be current and match the user when submitting a password', async t => {
  t.mock.method(Date, 'now', () => NOW);
  for (const [name, storage] of [
    ['expired while form was open', activeStorage(USER, NOW)],
    ['gate consumed by earlier submission', storageWith()],
    ['gate belongs to another user', activeStorage('another-user')],
    ['malformed gate', storageWith('{broken')],
  ]) {
    await t.test(name, async () => {
      const harness = authClient();
      await assert.rejects(updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-password', confirmation: 'new-password', storage }), LINK_ERROR);
      assert.deepEqual(harness.calls.updates, [], 'An ordinary signed-in session is not reset authorization');
    });
  }
});

test('server password-policy failures are shown without claiming success or consuming a valid gate', async t => {
  t.mock.method(Date, 'now', () => NOW);
  const error = new Error('This password was found in a breach. Choose another.');
  const harness = authClient({ updateError: error });
  const storage = activeStorage();
  await assert.rejects(updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-password', confirmation: 'new-password', storage }), error);
  assert.equal(harness.calls.updates.length, 1);
  assert.notEqual(storage.getItem(RECOVERY_KEY), null);
});

test('a successful recovery cannot be submitted a second time through the same gate', async t => {
  t.mock.method(Date, 'now', () => NOW);
  const harness = authClient();
  const storage = activeStorage();
  const options = { client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-password', confirmation: 'new-password', storage };
  await updateRecoveredPassword(options);
  await assert.rejects(updateRecoveredPassword(options), LINK_ERROR);
  assert.equal(harness.calls.updates.length, 1);
});

test('an unconfirmed password update is not reported as success', async t => {
  t.mock.method(Date, 'now', () => NOW);
  const harness = authClient({ updatedUserId: 'different-user' });
  await assert.rejects(updateRecoveredPassword({ client: harness.client, writePassword: harness.writePassword, userId: USER, password: 'new-password', confirmation: 'new-password', storage: activeStorage() }), /not confirmed/i);
});

test('a deletion request addresses support and includes ownership verification without credentials', () => {
  const url = new URL(deletionRequestURL('learner+test@example.com'));
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, SUPPORT_EMAIL);
  assert.equal(url.searchParams.get('subject'), 'Looplane account deletion request');
  const body = url.searchParams.get('body');
  assert.match(body, /Account email: learner\+test@example\.com/);
  assert.match(body, /cloud learning progress/i);
  assert.match(body, /verify my account ownership before deleting/i);
  assert.match(body, /Do not include passwords or verification codes/);
  assert.doesNotMatch(body, /access_token|refresh_token|code_verifier|service_role|Bearer /i);
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
});

test('deletion requests never silently claim to perform deletion and safely encode the supplied email', () => {
  const body = new URL(deletionRequestURL()).searchParams.get('body');
  assert.match(body, /\[Your Looplane account email\]/);
  assert.doesNotMatch(body, /account (?:is|has been) deleted/i);
  const url = new URL(deletionRequestURL('learner@example.com&bcc=other@example.com'));
  assert.equal(url.searchParams.get('bcc'), null);
  assert.match(url.searchParams.get('body'), /Account email: learner@example\.com&bcc=other@example\.com/);
});
