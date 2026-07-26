# Admin Access Recovery

**Severity:** P1 (P0 if it's the only admin account and payments/refunds are blocked)
**Owner:** Operator
**Last reviewed:** 2026-07-26

**Known gaps this runbook depends on** (verified directly against the code, not assumed):

- There IS a dedicated admin login route: `/admin-login` (form) → `POST /api/auth/admin-login`, which additionally checks `role === "ADMIN"` before redirecting to `/admin` (redirects to `/admin-login?error=not_admin` otherwise). The regular `/login` route works too — `requireAdmin()` (`src/lib/auth.ts:143-149`) checks `user.role === "ADMIN"` on whichever session is active regardless of which route created it, so an admin isn't required to use `/admin-login` specifically. _(Corrected 2026-07-26 — an earlier version of this runbook claimed no admin-specific route existed; verify routes directly under `src/app/` rather than trusting a doc's claim about "no X route.")_
- Admin TOTP 2FA now exists (opt-in, `/admin/settings` → "Enable two-factor authentication") — see `docs/audit-2026-07-26-hardening-review.md`. An admin with 2FA enabled must also supply their code (both `/login` and `/admin-login` accept an optional `totpCode` field) — `Login.ts` returns `totp_required` if it's missing and the account has 2FA on. This doesn't change the account-lockout/recovery steps below (2FA is a login-time check, not a session-revocation mechanism), but if `user_not_found`/`wrong_password` isn't the symptom, check the account's `twoFactorEnabled` flag before assuming something else is wrong.
- **Session/account revocation is weaker than it looks.** `src/lib/auth.ts`'s `getSessionUserId()`/`getSessionUser()` — the only session-check path, used by every page via `requireAuth`/`requireAdmin` — verifies the JWT's signature and expiry and re-fetches the `User` row, but **never queries the `sessions` table at all**. The `sessions` table is written by `Login.ts` (create) and `Logout.ts` (delete-on-logout) but nothing reads it back to gate access. Deleting a `sessions` row does **not** invalidate an already-issued JWT cookie — the cookie stays valid until its own expiry (7 days) or a `JWT_SECRET` rotation, regardless of what's in the table. Likewise, `User.lockedUntil` and `User.failedLoginCount` exist on the schema but are not read anywhere in `Login.ts` or `src/lib/auth.ts` — setting `lockedUntil` does not currently block anything. **What does work immediately**: `requireAdmin()` re-checks `user.role` freshly from the DB on every page load (not from a cached JWT claim), so demoting `role` away from `'ADMIN'` takes effect on the compromised account's very next request.

So "admin access recovery" reduces to: (1) at least one `User` row must have `role = 'ADMIN'` and a usable password, and (2) if an admin account is compromised, the _reliable_ immediate mitigation is a role downgrade (blocks `/admin/*` next request) plus a password rotation (blocks future logins) — not session-table deletion, which does nothing today.

`package.json`'s `db:seed:admin` script now points at a real `scripts/seed-admin-user.mjs`. It creates a `User` row with `role = 'ADMIN'` (or promotes an existing email to `ADMIN`) and hashes the password with the same Argon2id parameters as `Argon2PasswordHasher`:

```bash
export ADMIN_PASSWORD='Str0ng!Passw0rd'
pnpm db:seed:admin --email admin@example.com --first-name Admin --last-name User
# or omit ADMIN_PASSWORD entirely on a new account to have one generated and printed once
```

Prefer `ADMIN_PASSWORD` over the `--password` flag. A CLI argument lingers in shell history and is visible to other processes on the box (`ps`); an exported env var isn't. It's idempotent (upserts by email) and only rotates an existing admin's password if `--password`/`ADMIN_PASSWORD` is explicitly supplied. Omitting it on an existing account leaves the current password untouched rather than generating a value that would never actually be applied. It goes straight to Prisma rather than through `UserRepository.create()`, since that method hardcodes `role: "STUDENT"` (it's the self-signup path). The SQL-based procedure below is still the right tool when you don't have a Node/DB shell handy, or need to promote/downgrade an account rather than create one.

## Symptoms

- No one can log into `/admin/*` — either no `User` row has `role = 'ADMIN'`, or the only admin's password/email access is lost.
- An admin account is suspected compromised (unexpected entries in `AuditLog` for actions the real admin didn't take — check `/admin/audit-log`).
- A departing team member had `ADMIN` role and access needs to be revoked immediately.

## Diagnosis

1. Confirm the actual state — how many admins exist and whether any are usable:
   ```sql
   SELECT id, email, role, "verificationStatus", "lockedUntil", "failedLoginCount"
   FROM users
   WHERE role = 'ADMIN';
   ```
2. If investigating a suspected compromise, pull recent admin actions for that user from the audit log (admin UI at `/admin/audit-log`, or directly):
   ```sql
   SELECT action, resource, "resourceId", payload, "createdAt"
   FROM audit_logs
   WHERE "userId" = '<suspected user id>'
   ORDER BY "createdAt" DESC
   LIMIT 100;
   ```
3. Check for active sessions on the account in question:
   ```sql
   SELECT id, "userAgent", "ipAddress", "expiresAt", "createdAt"
   FROM sessions
   WHERE "userId" = '<user id>'
   ORDER BY "createdAt" DESC;
   ```

## Mitigation

### No working admin account exists

1. Find (or create) the `User` row that should become admin. If the person already has a student account, promote it — don't create a duplicate:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'person@example.com';
   ```
2. If that person has never signed up, they need to sign up normally first (`/signup`) — self-serve, no admin token needed for that step — then run the `UPDATE` above once their `User` row exists.
3. There is no separate admin invite/promotion UI in this codebase (`src/app/admin/users/[id]/page.tsx` shows `requireAdmin` and impersonation, but promoting a _new_ admin is not itself an admin panel feature as of this writing) — the SQL `UPDATE` above is the only path today. This is worth a follow-up story if admin promotion needs to happen without direct DB access.

### Admin forgot their password but the account is otherwise fine

Use the normal self-service flow — it doesn't require any special admin handling:

1. `/login` → "Forgot password" → triggers `RequestPasswordReset` (`src/usecases/auth/RequestPasswordReset.ts`), which emails a reset link via Resend.
2. If email delivery is also down (see a future `email-outage.md`), fall back to the direct-DB path below.

### Email is unavailable, or the account needs an immediate password reset without waiting on email

Set a password hash directly. **Do not write a plaintext password into the `password` column** — it must be an Argon2 hash matching what `Argon2PasswordHasher` (`src/infra/security/Argon2PasswordHasher.ts`) produces, or the account simply won't be able to log in. Generate one locally with the same library the app uses:

```bash
node -e '
  const argon2 = require("argon2");
  argon2.hash(process.argv[1]).then(h => console.log(h));
' "TemporaryStrongPassword123!"
```

Then:

```sql
UPDATE users SET password = '<hash from above>' WHERE email = 'admin@example.com';
```

Have the admin log in immediately and change the password via their account settings — this temporary password was visible in your shell history/terminal. (`"failedLoginCount"`/`"lockedUntil"` are safe to leave alone here — see the note above, nothing currently reads them.)

### Compromised admin account — lock it down

Do these in order — step 1 is the one that actually takes effect immediately; don't stop there.

1. **Downgrade the role first — this is the fast, reliable stop.** `requireAdmin()` re-fetches the user from the DB on every page load, so this blocks `/admin/*` on the account's very next request, even with its existing session cookie still "valid":
   ```sql
   UPDATE users SET role = 'STUDENT' WHERE id = '<user id>';
   ```
   Pick whatever non-admin role fits; `STUDENT` is the safe default. Do **not** rely on `DELETE FROM sessions WHERE "userId" = ...` or setting `"lockedUntil"` for this — verified directly against `src/lib/auth.ts`: neither is checked on the request path today, so neither actually revokes an active JWT. (Deleting the session rows is still fine to do for hygiene/cleanliness, just don't treat it as the fix.)
2. Rotate the password using the hash procedure above — this stops the compromised credentials from being used to log back in (as any role) once the current JWT eventually expires (7 days) or if the account is later re-promoted.
3. If you believe the JWT signing key itself (not just this one account) may be exposed, rotate `JWT_SECRET` in Vercel env vars — this is the only thing that invalidates an already-issued JWT before it naturally expires, but it logs out **every** user on the platform, not just the compromised account. Reserve this for a confirmed key-level compromise, not a single-account incident — role downgrade (step 1) is the targeted response for that.
4. Review the audit log (Diagnosis step 2) for every action taken while compromised, and manually assess/reverse anything damaging (e.g. a bogus refund, an altered discount code) — there is no automated rollback for admin actions.
5. **File a follow-up**: the app has no working per-session/per-account revocation mechanism short of a role change or a platform-wide secret rotation. That's a real gap worth its own hardening story (e.g. checking `sessions` table membership — or a `tokenVersion`/`sessionVersion` claim — on every request), independent of the admin-2FA gap already tracked in `docs/audit-2026-07-26-hardening-review.md`.

## Resolution

- Confirm the intended admin(s) — and only them — have `role = 'ADMIN'` and a working password.
- If this incident involved a compromise, decide whether the JWT-signing-key-level rotation (step 3 above) is warranted, given it affects every user, not just the compromised account.

## Verification

- The intended admin can log in via `/login` and reach `/admin` without a `forbidden` redirect.
- `SELECT role FROM users WHERE role = 'ADMIN'` returns exactly the expected set of accounts — no extras.
- For a compromise response: hitting `/admin` with the compromised account's still-active browser session now redirects to `/dashboard?error=forbidden` (role downgrade took effect), and logging in fresh with the old password fails (password rotation took effect).

## Postmortem

Required if this was a compromise (not required for a routine "forgot password" recovery). Cover: how the account was compromised, what actions were taken while compromised (from the audit log), and whether admin 2FA (currently absent — see `docs/audit-2026-07-26-hardening-review.md`'s follow-up list) would have prevented it.
