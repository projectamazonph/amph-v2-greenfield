# STORY-054 — Rate limiting (Upstash) + fakes + applied at every documented bucket

## Story

**Status:** ✅ Done (PR #100, commit `49b5bb1` — `Sprint 11: observability, rate limiting, and critical-journey coverage`; `src/infra/security/{UpstashRateLimiter,InMemoryRateLimiter}.ts` live; `RateLimiter` port is used by `ResendVerification`/`RequestPasswordReset`. **2026-07-22 follow-up (branch `claude/next-story-klge5f`):** the last checkbox below was unticked and actually unimplemented — `signUpAction`, `loginAndRedirect`, and `startCheckout` never called `rateLimiter.check()` at all, so signup/login/checkout had zero rate limiting despite this story's own goal statement. Closed: all three `perform*` helpers now check the rate limiter (signup: 10/hour/IP; login: 5/15min/email + 20/15min/IP; checkout: 10/hour/user) and return `{ kind: "rate_limited" }` when denied, fail-open on limiter errors (matches `RequestPasswordReset`'s existing pattern). See `SESSION-HANDOVER.md` for the full writeup.)

As a platform operator, I want rate limits on authentication, signup, and payment actions so brute-force and abuse attempts are slowed without hurting real users.

## Acceptance criteria

- [x] `RateLimiter` port exists in `src/ports/security/RateLimiter.ts` with `check(key, limit)` returning `Result<{ allowed: boolean; remaining: number }, RateLimitError>`.
- [x] `UpstashRateLimiter` adapter exists in `src/infra/security/UpstashRateLimiter.ts` using `@upstash/redis` + `@upstash/ratelimit` (lazy init).
- [x] `InMemoryRateLimiter` fake exists in `src/infra/security/InMemoryRateLimiter.ts` for tests.
- [x] `buildProductionContainer()` wires `UpstashRateLimiter` from `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- [x] `buildTestContainer()` wires `InMemoryRateLimiter`.
- [x] `AppContainer` exposes `rateLimiter`.
- [x] `signUpAction`, `loginAction`, and `createPaymentIntentAction` (or their perform helpers) call `rateLimiter.check()` and return `{ kind: "rate_limited" }` when not allowed. (Closed 2026-07-22 — see status note above.)
- [x] Architecture tests assert: only `infra/security/` imports `@upstash/*`; domain/usecases/ports never import it. (`tests/architecture/rate-limit-wiring.test.ts` now also asserts each of the three actions calls `rateLimiter.check(`.)

## Code shape

```
src/
  ports/security/RateLimiter.ts
  infra/security/UpstashRateLimiter.ts
  infra/security/InMemoryRateLimiter.ts
  app/actions/signup.action.ts        (+ rate limit check)
  app/actions/login.action.ts         (+ rate limit check)
  app/actions/createPaymentIntent.ts  (+ rate limit check)
  composition/container.ts            (+ rateLimiter field)
  composition/container.test.ts       (+ rateLimiter field)
tests/architecture/rate-limit-wiring.test.ts
tests/unit/infra/security/InMemoryRateLimiter.test.ts
```

## Pitfalls

- Lazy-init Upstash client so `next build` succeeds without Redis env vars.
- Rate-limit failures must be typed `Result.err`, not thrown exceptions.
- Don't rate-limit idempotent GET pages — only mutation actions.

## Definition of Done

- `pnpm typecheck` clean.
- `pnpm lint` clean.
- `pnpm test:arch` passes.
- `pnpm test` passes.
- `docs/stories/STORY-054.md` is this file.
- Conventional commit: `feat(security): STORY-054 rate limiting`.
