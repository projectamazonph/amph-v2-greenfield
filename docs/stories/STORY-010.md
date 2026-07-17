# STORY-010 · Auth unit + integration tests (every use case, every adapter)

**Sprint:** 2
**Points:** 1
**Epic:** Auth + test infrastructure
**Owner:** Ryan
**Dependencies:** STORY-009

## Goal

Lock down every use case in `src/usecases/auth/` with unit tests using `buildTestContainer()`, and every auth-related adapter (`Argon2PasswordHasher`, `JoseTokenService`, the email verification / password reset repos) with integration tests against the real Postgres. After this story, the auth flow is fully tested end-to-end at the use-case and adapter layers; the only thing left to test is the user-facing pages (covered by e2e in Sprint 11).

## Acceptance criteria

- [ ] Every use case in `src/usecases/auth/` has a test file with at least: happy path, every error case, idempotency (if applicable), and rate-limit (if applicable).
- [ ] `Argon2PasswordHasher` integration test: hash + verify round-trip, wrong password returns false, malformed hash throws.
- [ ] `JoseTokenService` integration test: sign + verify round-trip, expired token returns error, tampered token returns error, wrong-secret token returns error.
- [ ] `PrismaEmailVerificationRepository` integration test: create + findByTokenHash + markUsed; `usedAt` is set; `expiresAt` is preserved.
- [ ] `PrismaPasswordResetRepository` integration test: create + findByTokenHash + markUsed + invalidateAllForUser; existing tokens are invalidated.
- [ ] Coverage: 100% on `src/domain/auth/`, 90%+ on `src/usecases/auth/`, 80%+ on `src/infra/auth/`.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:coverage && pnpm build` all green.

## Files touched

| File | Action |
|------|--------|
| `src/usecases/auth/__tests__/SignUp.test.ts` | Verify complete coverage of all error cases |
| `src/usecases/auth/__tests__/SignIn.test.ts` | Complete |
| `src/usecases/auth/__tests__/SignOut.test.ts` | Complete |
| `src/usecases/auth/__tests__/VerifyEmail.test.ts` | Complete |
| `src/usecases/auth/__tests__/ResendVerification.test.ts` | Complete |
| `src/usecases/auth/__tests__/RequestPasswordReset.test.ts` | Complete |
| `src/usecases/auth/__tests__/ResetPassword.test.ts` | Complete |
| `src/infra/auth/__tests__/Argon2PasswordHasher.test.ts` | Create / complete |
| `src/infra/auth/__tests__/JoseTokenService.test.ts` | Create / complete |
| `src/infra/db/prisma/__tests__/PrismaEmailVerificationRepository.test.ts` | Create |
| `src/infra/db/prisma/__tests__/PrismaPasswordResetRepository.test.ts` | Create |
| `vitest.config.ts` | Modify — coverage thresholds per layer |

## Code shape

```ts
// src/usecases/auth/__tests__/SignIn.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { SignIn } from "../SignIn";
import { buildTestContainer } from "@composition/testContainer";
import { Result } from "@lib/Result";
import type { Container } from "@composition/container";

describe("SignIn", () => {
  let c: Container;
  let signIn: SignIn;

  beforeEach(() => {
    c = buildTestContainer();
    signIn = new SignIn({
      users: c.users,
      passwordHasher: c.passwordHasher,
      tokenService: c.tokenService,
      rateLimiter: c.rateLimiter,
      clock: c.clock,
      logger: c.logger,
      sessionTtlDays: 7,
    });
    // Seed: create a verified user with a known password hash
  });

  it("happy path: signs in and returns a token", async () => {
    const result = await signIn.exec({ email: "test@example.com", password: "Test1234!@#$", ip: "127.0.0.1", userAgent: "test" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.email).toBe("test@example.com");
      expect(result.value.token).toBeTypeOf("string");
      expect(result.value.expiresAt).toBeInstanceOf(Date);
    }
  });

  it("invalid credentials: returns error", async () => {
    const result = await signIn.exec({ email: "test@example.com", password: "wrong-password-1234!@", ip: "127.0.0.1", userAgent: "test" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_credentials");
  });

  it("email not verified: returns error", async () => { /* ... */ });
  it("rate limited: returns error after 5 attempts in 15 min", async () => { /* ... */ });
  it("validation failed: returns error for invalid input", async () => { /* ... */ });
});
```

## Pitfalls

- **Use `buildTestContainer()` for use case tests.** The fake `passwordHasher` returns a deterministic hash for `"Test1234!@#$"`, so the test can pre-seed a user with that hash and assert sign-in succeeds.
- **Use the real Postgres for adapter integration tests.** The CI service container provides one. The test connects, runs migrations, runs the test, truncates the relevant tables.
- **The rate-limit test uses a fake `RateLimiter` that returns `Result.err` after N calls.** The test pre-configures the fake. Don't try to test the real Upstash limiter here — that's a different test.
- **Coverage thresholds are enforced in CI.** The `vitest.config.ts` thresholds are the same as `docs/build-spec.md` §"Coverage gates". If a use case has 85% branch coverage and the threshold is 90%, fail the build and add tests.
- **The fake `passwordHasher` and `tokenService` are in `src/infra/auth/fake/`.** They implement the same ports as the real adapters. Tests use the fakes; integration tests use the real adapters.

## Verification

```bash
pnpm test
# All use case tests pass

pnpm test:coverage
# Coverage report: 100% on src/domain/auth, 90%+ on src/usecases/auth, 80%+ on src/infra/auth
```

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] Every use case in `src/usecases/auth/` has a test file covering all error cases.
- [ ] Adapter integration tests pass.
- [ ] Coverage thresholds met per `docs/build-spec.md`.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:coverage && pnpm build` all green.
- [ ] `docs/stories/STORY-010.md` exists (this file).
- [ ] Conventional commit: `test(auth): complete auth test coverage (STORY-010)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated with Sprint 2 closing notes.
