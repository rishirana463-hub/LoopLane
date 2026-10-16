# Account support

Looplane offers password recovery at `/reset-password` and manual account-deletion requests at `/delete-account`. Deletion requests are reviewed by the operator; the app does not delete accounts or send support emails automatically.

## Password recovery configuration

Keep the existing Supabase Auth Site URL and signup/Google redirect URLs. Add the exact recovery destinations to **Authentication → URL Configuration → Redirect URLs**:

```text
https://looplane-jogger.vercel.app/reset-password
http://localhost:5173/reset-password
http://127.0.0.1:5173/reset-password
```

Use the recovery URL for the actual origin when testing another development port. Keep the recovery email template's confirmation link and configured SMTP delivery working. No new client secrets or service-role keys are needed.

The requester must open the latest email link in the browser where they requested it. Supabase uses PKCE to bind the link to that browser. The recovery route explicitly exchanges the code and verifies the user with Auth; an existing signed-in account cannot replace a failed exchange. A per-tab marker contains only the verified user ID and a 30-minute expiry, never credentials or learning data. It supports reloading after code consumption and is removed on completion, cancellation, expiry, or account changes. If browser storage is unavailable, memory supports the current visit.

Password updates use a temporary, nonpersistent client bound to the verified recovery session. It is disposed after the request, so an account switch in another tab cannot redirect the update to that account. Password fields and tokens are not sent to analytics or cloud progress.

## Process a deletion request

1. Receive the request at **rishirana463@gmail.com**. Verify that the requester controls the email attached to the Looplane account, including the Google account email when applicable. Do not accept a display name or claimed user ID as proof. Never ask for a password or login/recovery code.
2. Confirm the exact account email and Auth user ID in the dedicated **Looplane** Supabase project. Account and synced progress deletion is permanent. Explain that browser-local progress and downloaded app files remain until the user clears site data on each device.
3. Revoke the user's refresh tokens and sessions, then permanently delete that exact Auth user. The progress foreign key cascades deletion to its cloud row. Use the administrative dashboard or the guarded transaction below from the SQL editor; never expose this operation through a public client/RPC or put a service-role key in the app.
4. Check that the user's Auth record, identities, sessions, refresh tokens, and progress row are absent. Confirm that no unrelated user was affected. Already issued access tokens can remain cryptographically valid until expiry; the progress foreign key prevents them from recreating the deleted user's row.
5. Reply to the requester after completion. Support emails and provider operational logs are separate from app account/progress records; do not claim that deleting an Auth user erases those records or local device data. Signing in with Google again can create a new account.

### Guarded administrative transaction

Replace both placeholders with the **verified** UUID and email. Inspect the target first. This is operator-only maintenance, never application-side SQL.

```sql
begin;
do $$
declare
  target_id uuid := 'VERIFIED_USER_UUID';
  target_email text := 'VERIFIED_ACCOUNT_EMAIL';
  removed integer;
begin
  if not exists (
    select 1 from auth.users
    where id = target_id and lower(email) = lower(target_email)
  ) then
    raise exception 'Account identity guard failed; no deletion';
  end if;
  delete from auth.refresh_tokens where user_id = target_id::text;
  delete from auth.sessions where user_id = target_id;
  delete from auth.users
    where id = target_id and lower(email) = lower(target_email);
  get diagnostics removed = row_count;
  if removed <> 1 then
    raise exception 'Expected exactly one verified account';
  end if;
end $$;
commit;
```

## Verification performed on 16 October 2026

- Automated recovery tests cover valid/expired/reused links, missing PKCE verifier, unrelated existing sessions, reload markers, changed accounts, gate expiry, mismatched/weak passwords, server errors, and safe deletion drafts.
- Two explicitly marked disposable accounts were created administratively in the Looplane project. Both signed in through the real Auth API and saved their own progress through the Data API. Cross-account writes and a client attempt at administrative deletion were denied.
- Account A was permanently deleted with exact UUID/email/test-marker guards. Auth, identity, session, refresh-token and progress counts became zero. Its old password and refresh token failed; its existing access token could not recreate progress (foreign-key violation).
- Account B could still update its progress. The actual session-bound password writer changed B's disposable password; the old password failed and the new one signed in. B and all verification credentials were then removed.
- This verifies server deletion and password-update mechanics. It does **not** represent a real support request, ownership-verification exchange, or final recovery-email delivery/new-password entry by the owner. Complete that email round trip on the deployed app and repeat it on a real phone before launch.
