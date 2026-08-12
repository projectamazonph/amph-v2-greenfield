# Admin Access Recovery

**Severity:** P1 (P0 if it's the only admin account and payments/refunds are blocked)
**Owner:** Operator
**Last reviewed:** 2026-08-12

**Known gaps this runbook depends on** (verified directly against the code, not assumed):

- There IS a dedicated admin login route: `/admin-login` (form) → `POST /api/auth/admin-login`, which additionally checks `role === "ADMIN"` before redirecting to `/admin` (redirects to `/admin-login?error=not_admin` otherwise). The regular `/login` route works too — `requireAdmin()` (`src/lib/auth.ts:143-149`) checks `user.role === "ADMIN"` on whichever session is active regardless of which route created it, so an admin isn't required to use `/admin-login` specifically. _(Corrected 2026-07-26 — an earlier version of this runbook claimed no admin-specific route existed; verify routes directly under `src/app/` rather than trusting a doc's claim about "no X route.")_
- Admin TOTP 2FA now exists (opt-in, `/admin/settings` → "Enable two-factor authentication") — see `docs/audit-2026-07-26-hardening-review.md`. An admin with 2FA enabled must also supply their code (both `/login` and `/admin-login` accept an optional `totpCode` field) — `Login.ts` returns `totp_required` if it's missing and the account has 2FA on. This doesn't change the account-lockout/recovery steps below (2FA is a login-time check, not a session-revocation mechanism), but if `user_not_found`/`wrong_password` isn't the symptom, check the account's `twoFactorEnabled` flag before assuming something else is wrong.
- Session/account revocation is enforced for current login tokens. `getSessionUserId()` checks the session repository when a JWT contains `sessionId`, login enforces `lockedUntil`, and `requireAdmin()` re-reads the user's role. Delete the user's sessions, set an appropriate lock, rotate the password, and demote the role when compromise is suspected.

Admin access recovery requires at least one usable `ADMIN` account. For a compromised account, combine session deletion, lockout or password rotation, and role demotion as appropriate.

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

Have the admin log in immediately and change the password via account settings. Clear a stale lock only after confirming ownership because login enforces `lockedUntil`.

### Compromised admin account — lock it down

Do these in order:

1. **Downgrade the role first — this is the fast, reliable stop.** `requireAdmin()` re-fetches the user from the DB on every page load, so this blocks `/admin/*` on the account's very next request, even with its existing session cookie still "valid":
   ```sql
   UPDATE users SET role = 'STUDENT' WHERE id = '<user id>';
   ```
   Pick the correct non-admin role; `STUDENT` is the safest default.
2. Delete the user's session rows. JWTs issued by the current login flow carry `sessionId`, and request guards reject a missing session.
3. Set `lockedUntil` when a temporary account lock is needed, then rotate the password.
4. If the JWT signing key itself may be exposed, rotate `JWT_SECRET` in Vercel. This logs out every user and is reserved for a confirmed key compromise.
5. Review the audit log (Diagnosis step 2) for every action taken while compromised, and manually assess or reverse anything damaging. There is no automated rollback for admin actions.

## Resolution

- Confirm the intended admin(s) — and only them — have `role = 'ADMIN'` and a working password.
- If this incident involved a compromise, decide whether the JWT-signing-key-level rotation (step 4 above) is warranted, given it affects every user, not just the compromised account.

## Verification

- The intended admin can log in via `/login` and reach `/admin` without a `forbidden` redirect.
- `SELECT role FROM users WHERE role = 'ADMIN'` returns exactly the expected set of accounts — no extras.
- For a compromise response: hitting `/admin` with the compromised account's still-active browser session now redirects to `/dashboard?error=forbidden` (role downgrade took effect), and logging in fresh with the old password fails (password rotation took effect).

## Postmortem

Required if this was a compromise, but not for a routine forgot-password recovery. Cover how the account was compromised, what actions were taken while compromised, whether the admin had opt-in TOTP enabled, and whether mandatory 2FA policy would have reduced the risk.
