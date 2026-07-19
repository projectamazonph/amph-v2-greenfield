# STORY-055 — Tenant isolation audit + 6 critical-journey E2E tests + axe a11y

## Story

As a security reviewer, I want documented tenant isolation, automated critical-journey E2E coverage, and axe accessibility checks, so we can launch with confidence.

## Acceptance criteria

- [ ] `docs/security/tenant-isolation.md` is updated with the current query-level isolation rules and any gaps.
- [ ] `tests/e2e/critical-journeys.spec.ts` covers 6 critical user journeys:
  1. Sign up → auto-login → see dashboard.
  2. Browse courses → view course detail.
  3. Admin creates a discount code.
  4. Admin creates a course.
  5. Admin issues a certificate for a completed enrollment.
  6. Public verifies a certificate by hash.
- [ ] Each E2E journey uses `buildTestContainer()` seeding or direct DB seed helpers, not UI setup where unnecessary.
- [ ] `tests/e2e/a11y.spec.ts` runs axe-core on `/`, `/courses`, `/signup`, `/login`, and `/dashboard`.
- [ ] CI job `e2e` runs both Playwright specs.
- [ ] Architecture tests assert tenant-isolation doc exists and critical-journey spec exists.

## Code shape

```
docs/security/tenant-isolation.md       (updated)
tests/e2e/critical-journeys.spec.ts     (new)
tests/e2e/a11y.spec.ts                  (new)
tests/e2e/helpers/seed.ts               (new — minimal DB seed helpers)
tests/architecture/story-055-wiring.test.ts
```

## Pitfalls

- E2E tests must not depend on external services (Resend, PayMongo, Upstash). Use test container + stubs.
- Axe assertions should be warnings, not hard failures, until existing issues are fixed.
- Seed helpers must clear state between tests to avoid flakiness.

## Definition of Done

- `pnpm typecheck` clean.
- `pnpm lint` clean.
- `pnpm test:arch` passes.
- `DATABASE_URL=... JWT_SECRET=... pnpm test` passes.
- `pnpm test:e2e` passes (or pre-existing failures are documented).
- `docs/stories/STORY-055.md` is this file.
- Conventional commit: `feat(tests): STORY-055 critical journeys + a11y + tenant isolation audit`.
