# STORY-008 · Password reset (request + confirm)

**Sprint:** 2
**Points:** 1
**Epic:** Auth
**Owner:** Ryan
**Dependencies:** STORY-007
**Status:** ✅ Done (PR #107, commit `df775ba` — same PR; `RequestPasswordReset` + `ResetPassword` use cases + `/reset-password` + `/reset-password/[token]` pages)

## Goal

Implement the password-reset flow: user requests a reset, gets an email, clicks the link, sets a new password. Rate-limited to prevent abuse. Always responds successfully (even if the email doesn't exist) to prevent email enumeration.

## Acceptance criteria

- [ ] `prisma/schema.prisma` — `PasswordReset` model per `docs/db-schema.md` (id, userId, tokenHash, expiresAt, usedAt, createdAt).
- [ ] `prisma/migrations/0004_password_reset/migration.sql` — generated.
- [ ] `src/ports/repositories/PasswordResetRepository.ts` — `create(userId, tokenHash, expiresAt)`, `findByTokenHash(tokenHash)`, `markUsed(id)`, `invalidateAllForUser(userId)`.
- [ ] `src/infra/db/prisma/PrismaPasswordResetRepository.ts` + `InMemoryPasswordResetRepository.ts`.
- [ ] `src/usecases/auth/RequestPasswordReset.ts` — class. Input: email. Output: `{ sent: boolean }` (always `true` for valid input, to prevent enumeration). Errors: rate-limited, validation-failed. Side effects: if user exists, create a `PasswordReset` row and send the email.
- [ ] `src/usecases/auth/ResetPassword.ts` — class. Input: token, newPassword. Output: `{ user }`. Errors: invalid-token, token-expired, token-already-used, weak-password, validation-failed. Side effects: mark token used, update password, increment `tokenVersion` (revokes all existing sessions), send confirmation email.
- [ ] `src/app/(auth)/reset-password/page.tsx` — request form.
- [ ] `src/app/(auth)/reset-password/[token]/page.tsx` — confirm form.
- [ ] `src/app/actions/auth.ts` — add `requestPasswordResetAction`, `resetPasswordAction`.
- [ ] Tests: `RequestPasswordReset` (4 cases), `ResetPassword` (5 cases).
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.

## Files touched

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify — add `PasswordReset` model |
| `prisma/migrations/0004_password_reset/migration.sql` | Create (generated) |
| `src/ports/repositories/PasswordResetRepository.ts` | Create |
| `src/infra/db/prisma/PrismaPasswordResetRepository.ts` | Create |
| `src/infra/db/inmemory/InMemoryPasswordResetRepository.ts` | Create |
| `src/usecases/auth/RequestPasswordReset.ts` | Create |
| `src/usecases/auth/ResetPassword.ts` | Create |
| `src/usecases/auth/__tests__/RequestPasswordReset.test.ts` | Create |
| `src/usecases/auth/__tests__/ResetPassword.test.ts` | Create |
| `src/app/(auth)/reset-password/page.tsx` | Create |
| `src/app/(auth)/reset-password/ResetRequestForm.tsx` | Create |
| `src/app/(auth)/reset-password/[token]/page.tsx` | Create |
| `src/app/(auth)/reset-password/[token]/ResetConfirmForm.tsx` | Create |
| `src/app/actions/auth.ts` | Modify — add `requestPasswordResetAction`, `resetPasswordAction` |
| `src/composition/container.ts` | Modify — wire `passwordResetRepo` |

## Code shape

```ts
// src/usecases/auth/RequestPasswordReset.ts
export type RequestPasswordResetInput = { email: string; ip: string };
export type RequestPasswordResetOutput = { sent: true };  // always true
export type RequestPasswordResetError =
  | { kind: "rate_limited"; resetAt: Date }
  | { kind: "validation_failed"; issues: z.ZodIssue[] };

export class RequestPasswordReset {
  constructor(private deps: {
    users: UserRepository;
    passwordResets: PasswordResetRepository;
    email: EmailSender;
    rateLimiter: RateLimiter;
    clock: Clock;
    ids: IdGenerator;
    logger: Logger;
    passwordResetSecret: string;
  }) {}

  async exec(input: RequestPasswordResetInput): Promise<Result<RequestPasswordResetOutput, RequestPasswordResetError>> {
    // 1. Zod validate
    // 2. Rate limit by email (5/hour) AND by IP (20/hour)
    // 3. Look up user
    // 4. If user exists: invalidate existing tokens, create new one, send email
    // 5. Return { sent: true } regardless
  }
}
```

## Pitfalls

- **Always respond with `{ sent: true }`.** If the email doesn't exist, no email is sent and no error is returned. This prevents email enumeration. The rate limit is the only signal a malicious client gets.
- **Tokens are invalidated on new request.** `passwordResets.invalidateAllForUser(userId)` is called before creating the new token. Only the latest reset link works.
- **On successful reset, `tokenVersion` is incremented.** All existing sessions for the user are revoked. The user has to sign in again on every device.
- **Confirmation email is sent on successful reset.** "Your password was changed." Sent to the email address (not the new password — there is no new password sent, ever).
- **The reset link has 1-hour TTL.** Shorter than the verification email.
- **The new password is validated with `validatePassword` from STORY-003.** Same rules.
- **The reset form is on `/reset-password/[token]`** (server-rendered) so the token is in the URL and the form is pre-targeted. The action is `resetPasswordAction(formData)` which extracts the token from the form.

## Verification

```bash
pnpm test -- RequestPasswordReset ResetPassword
# RequestPasswordReset: 4 tests (happy-existing-user, happy-nonexistent-user-noop, rate-limited, validation-failed)
# ResetPassword: 5 tests (happy, invalid-token, token-expired, token-already-used, weak-password)

pnpm dev
# Sign in as test user
# Click "forgot password" on /signin
# Enter email, submit
# Should show "check your email" (always, even if email doesn't exist)
# Copy the link from the email queue / console
# Click it, set new password
# Should redirect to /signin with a "password reset successful" flash
# Try the same link again
# Should show "token already used" error
```

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] `RequestPasswordReset` covered by 4 tests, `ResetPassword` by 5 tests.
- [ ] Email enumeration is impossible (always respond with `sent: true`).
- [ ] Successful reset increments `tokenVersion`, revokes all sessions.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] `docs/stories/STORY-008.md` exists (this file).
- [ ] Conventional commit: `feat(auth): password reset request + confirm (STORY-008)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.
