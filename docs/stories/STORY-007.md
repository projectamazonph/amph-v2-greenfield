# STORY-007 · Email verification

**Sprint:** 2
**Points:** 1
**Epic:** Auth
**Owner:** Ryan
**Dependencies:** STORY-006

## Goal

The verification link that the user got during signup (STORY-003) actually works. The user clicks the link, the token is verified, the user's `emailVerifiedAt` is set, and they land on a "verified" page. There's also a "resend verification" flow with rate limiting.

## Acceptance criteria

- [ ] `prisma/schema.prisma` — `EmailVerification` model per `docs/db-schema.md` (id, userId, tokenHash, expiresAt, usedAt, createdAt).
- [ ] `prisma/migrations/0003_email_verification/migration.sql` — generated.
- [ ] `src/ports/repositories/EmailVerificationRepository.ts` — `create(userId, tokenHash, expiresAt)`, `findByTokenHash(tokenHash)`, `markUsed(id)`.
- [ ] `src/infra/db/prisma/PrismaEmailVerificationRepository.ts` + `InMemoryEmailVerificationRepository.ts` — both.
- [ ] `src/usecases/auth/VerifyEmail.ts` — class. Input: token (raw, not hashed). Output: `{ user }`. Errors: invalid-token, token-expired, token-already-used.
- [ ] `src/usecases/auth/ResendVerification.ts` — class. Input: userId. Output: `{ sent: boolean, retryAfter: Date }`. Errors: already-verified, rate-limited.
- [ ] `src/app/(auth)/verify-email/page.tsx` — landing page that takes `?token=...` from the URL, calls `VerifyEmail`, redirects to /dashboard on success or /verify-email?error=... on failure.
- [ ] `src/app/(auth)/verify-email/sent/page.tsx` — "check your email" page (already exists from STORY-004, but add a "resend" button).
- [ ] `src/app/actions/auth.ts` — add `resendVerificationAction`.
- [ ] Tests: `VerifyEmail` (4 cases), `ResendVerification` (3 cases).
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.

## Files touched

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify — add `EmailVerification` model |
| `prisma/migrations/0003_email_verification/migration.sql` | Create (generated) |
| `src/ports/repositories/EmailVerificationRepository.ts` | Create |
| `src/infra/db/prisma/PrismaEmailVerificationRepository.ts` | Create |
| `src/infra/db/inmemory/InMemoryEmailVerificationRepository.ts` | Create |
| `src/usecases/auth/VerifyEmail.ts` | Create |
| `src/usecases/auth/ResendVerification.ts` | Create |
| `src/usecases/auth/__tests__/VerifyEmail.test.ts` | Create |
| `src/usecases/auth/__tests__/ResendVerification.test.ts` | Create |
| `src/app/(auth)/verify-email/page.tsx` | Create |
| `src/app/(auth)/verify-email/sent/page.tsx` | Modify — add "resend" button |
| `src/app/actions/auth.ts` | Modify — add `resendVerificationAction` |
| `src/composition/container.ts` | Modify — wire `emailVerificationRepo` |

## Code shape

```ts
// src/usecases/auth/VerifyEmail.ts
export type VerifyEmailInput = { token: string };
export type VerifyEmailOutput = { user: User };
export type VerifyEmailError =
  | { kind: "invalid_token" }
  | { kind: "token_expired" }
  | { kind: "token_already_used" };

export class VerifyEmail {
  constructor(private deps: {
    emailVerifications: EmailVerificationRepository;
    users: UserRepository;
    clock: Clock;
    logger: Logger;
  }) {}

  async exec(input: VerifyEmailInput): Promise<Result<VerifyEmailOutput, VerifyEmailError>> {
    const tokenHash = sha256(input.token);
    const record = await this.deps.emailVerifications.findByTokenHash(tokenHash);
    if (!record) return Result.err({ kind: "invalid_token" });
    if (record.usedAt) return Result.err({ kind: "token_already_used" });
    if (record.expiresAt < this.deps.clock.now()) return Result.err({ kind: "token_expired" });

    await this.deps.emailVerifications.markUsed(record.id);
    const user = await this.deps.users.update(record.userId, { emailVerifiedAt: this.deps.clock.now() }, null);
    return Result.ok({ user });
  }
}
```

## Pitfalls

- **The token in the URL is hashed before lookup.** Never store raw tokens; if the DB is compromised, the tokens are still useless. `sha256(token)` is enough for this use case (no need for HMAC; the token itself is the secret).
- **The token has 24-hour TTL.** Stored on the row, checked in the use case.
- **The token is single-use.** `usedAt` is checked. After use, the token is dead.
- **`ResendVerification` rate-limits at 60 seconds per user.** Use the `verification_resend_per_email` rate limit bucket.
- **The verification page handles the `?error=...` query param** and renders an appropriate error message. Don't redirect on error; the user needs to see what went wrong.
- **`/verify-email` is the public route.** `/verify-email/sent` is the public route. Both are in `(auth)`.

## Verification

```bash
pnpm test -- VerifyEmail ResendVerification
# VerifyEmail: 4 tests (happy, invalid-token, token-expired, token-already-used)
# ResendVerification: 3 tests (happy, already-verified, rate-limited)

pnpm dev
# Sign up a new user
# Copy the verification link from the email queue / console
# Paste in browser
# Should redirect to /dashboard, user.emailVerifiedAt is set
# Try the same link again
# Should show "token already used" error
# Click "resend" on /verify-email/sent
# New verification email is sent, old one is invalidated? (no, both are valid until used or expired)
```

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] `VerifyEmail` covered by 4 tests, `ResendVerification` by 3 tests.
- [ ] Tokens are hashed in the DB.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] `docs/stories/STORY-007.md` exists (this file).
- [ ] Conventional commit: `feat(auth): VerifyEmail + ResendVerification + email_verifications table (STORY-007)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.
