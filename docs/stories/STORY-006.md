# STORY-006 · SignIn, SignOut, JWT cookie

**Sprint:** 2
**Points:** 1
**Epic:** Auth
**Owner:** Ryan
**Dependencies:** STORY-005

## Goal

Implement `SignIn`, `SignOut`, the `Argon2PasswordHasher` adapter, the JWT minting/verifying, and the cookie set/clear helpers. After this story, a user can sign up (Sprint 1), sign in, sign out, and the session is held in a JWT in an HttpOnly cookie.

## Acceptance criteria

- [ ] `src/ports/services/PasswordHasher.ts` — interface (`hash(plain): Promise<string>`, `verify(plain, hash): Promise<boolean>`).
- [ ] `src/infra/auth/Argon2PasswordHasher.ts` — implements the port with argon2id.
- [ ] `src/ports/services/TokenService.ts` — interface (`sign(payload, expiresAt): string`, `verify(token): Result<Payload, TokenError>`).
- [ ] `src/infra/auth/JoseTokenService.ts` — implements the port with `jose` (HS256, secret from env).
- [ ] `src/ports/services/SessionRepository.ts` — minimal: `recordIssued(userId, tokenId, expiresAt)`, `isRevoked(tokenId): boolean`, `revoke(tokenId)`. (For tracking `tokenVersion` increments; we don't store every issued token, just the per-user `tokenVersion` on `User`.)
- [ ] `src/usecases/auth/SignIn.ts` — class. Input: email, password, ip, userAgent. Output: `{ user, token, expiresAt }`. Errors: invalid-credentials, email-not-verified, rate-limited, validation-failed.
- [ ] `src/usecases/auth/SignOut.ts` — class. Revokes the current session (increments `User.tokenVersion`).
- [ ] `src/lib/sessionCookie.ts` — `setSessionCookie(token, expiresAt)`, `clearSessionCookie()`. Sets HttpOnly, Secure, SameSite=Lax, Path=/.
- [ ] `src/app/(auth)/signin/page.tsx` — signin form page. Mobile-first responsive.
- [ ] `src/app/(auth)/signin/SigninForm.tsx` — `'use client'` form.
- [ ] `src/app/actions/auth.ts` — `signInAction`, `signOutAction`.
- [ ] Tests: `SignIn` (5+ cases), `SignOut` (1+), `Argon2PasswordHasher` (3+), `JoseTokenService` (3+).
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.

## Files touched

| File | Action |
|------|--------|
| `src/ports/services/PasswordHasher.ts` | Create |
| `src/infra/auth/Argon2PasswordHasher.ts` | Create |
| `src/ports/services/TokenService.ts` | Create |
| `src/infra/auth/JoseTokenService.ts` | Create |
| `src/usecases/auth/SignIn.ts` | Create |
| `src/usecases/auth/SignOut.ts` | Create |
| `src/usecases/auth/__tests__/SignIn.test.ts` | Create |
| `src/usecases/auth/__tests__/SignOut.test.ts` | Create |
| `src/infra/auth/__tests__/Argon2PasswordHasher.test.ts` | Create |
| `src/infra/auth/__tests__/JoseTokenService.test.ts` | Create |
| `src/lib/sessionCookie.ts` | Create |
| `src/app/(auth)/signin/page.tsx` | Create |
| `src/app/(auth)/signin/SigninForm.tsx` | Create |
| `src/app/(auth)/signin/SigninForm.module.css` | Create |
| `src/app/actions/auth.ts` | Modify — add `signInAction`, `signOutAction` |
| `src/composition/container.ts` | Modify — wire `passwordHasher`, `tokenService` |
| `prisma/schema.prisma` | Modify — add `tokenVersion Int @default(0)` to `User` |
| `prisma/migrations/0002_token_version/migration.sql` | Create (generated) |

## Code shape

```ts
// src/usecases/auth/SignIn.ts
export type SignInInput = { email: string; password: string; ip: string; userAgent: string };
export type SignInOutput = { user: User; token: string; expiresAt: Date };
export type SignInError =
  | { kind: "invalid_credentials" }
  | { kind: "email_not_verified" }
  | { kind: "rate_limited"; resetAt: Date }
  | { kind: "validation_failed"; issues: z.ZodIssue[] };

export class SignIn {
  constructor(private deps: {
    users: UserRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
    rateLimiter: RateLimiter;
    clock: Clock;
    logger: Logger;
    sessionTtlDays: number;
  }) {}

  async exec(input: SignInInput): Promise<Result<SignInOutput, SignInError>> {
    // 1. Zod validate
    // 2. Rate limit by email
    // 3. Find user by email
    // 4. Verify password
    // 5. Check email verified
    // 6. Sign JWT (payload: { sub, email, role, tokenVersion, iat, exp })
    // 7. Return
  }
}
```

## Pitfalls

- **The user-not-found case must not be distinguishable from wrong-password.** Both return `invalid_credentials`. The response time should be the same. Either always run `passwordHasher.verify` against a dummy hash, or use a constant-time comparison.
- **JWT secret must be at least 32 bytes.** `JWT_SECRET` env var. The `gen:secret` script generates one.
- **`tokenVersion` is per-user.** Incrementing it revokes all sessions for that user. Used for "force sign out" admin actions and for password changes.
- **The cookie is set in the server action, not the use case.** The use case returns the token; the action sets the cookie. The use case does not know about Next.js cookies.
- **`signOutAction` increments `tokenVersion`.** The cookie is cleared. The next request has no valid JWT (because the old token's `tokenVersion` no longer matches the user's current `tokenVersion`).
- **`User.tokenVersion` is added to the JWT payload.** Verification: `jwt.tokenVersion === user.tokenVersion`. If not, the token is treated as revoked.
- **The session cookie is `HttpOnly`, `Secure` (in production), `SameSite=Lax`, `Path=/`.** `__Secure-` prefix in production. `amph_session` in dev.

## Verification

```bash
pnpm test -- SignIn SignOut
# SignIn: 5 tests (happy, invalid-credentials, email-not-verified, rate-limited, validation-failed)
# SignOut: 1 test (increments tokenVersion)

pnpm dev
# Sign in with the user from STORY-004's test database
# Check that the cookie is set with the right attributes
# Refresh the page, JWT verified
# Click sign out, cookie cleared, refresh redirects to /signin
```

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] `SignIn` covered by 5+ tests, `SignOut` by 1+ test.
- [ ] Cookie attributes match the spec.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] `docs/stories/STORY-006.md` exists (this file).
- [ ] Conventional commit: `feat(auth): SignIn/SignOut + argon2 + jose + jwt cookie (STORY-006)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.
