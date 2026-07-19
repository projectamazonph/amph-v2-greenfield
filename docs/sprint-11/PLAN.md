# Sprint 11 — Observability + Tests (PLAN)

**Date:** 2026-07-19 (drafted at end of Sprint 10)
**Goal:** Make the production system observable, slow abuse, and prove the most critical user journeys work end-to-end.

## Stories

| ID | Title | Pts | Story doc |
|----|-------|-----|-----------|
| 051 | Sentry setup (client/server/edge) + source maps | 1 | (TBD) |
| 052 | Structured logging (Pino) + `withActionTracing` HOC + redaction | 1 | (TBD) |
| 053 | Lighthouse CI + Web Vitals | 1 | (TBD) |
| 054 | Rate limiting (Upstash) + fakes + applied at every documented bucket | 1 | (TBD) |
| 055 | Tenant isolation audit + 6 critical-journey E2E tests + axe a11y | 1 | (TBD) |

## Open questions to resolve in Sprint 11 planning

- **Sentry org/project**: confirm Sentry account exists; if not, use `pnpm dlx` to scaffold a Next.js project
- **Upstash account**: confirm Upstash Redis account exists; fakes need to be wired into the test container alongside real adapter
- **Critical journeys to E2E test**: candidate list is signup → enroll → start lesson → take quiz → earn badge → see dashboard. Pick the 6 that maximize coverage / cost
- **Axe a11y scope**: only new admin pages, or all pages? Likely all for launch readiness
- **Tenant isolation audit**: this is a 1-point story that says "audit" — does it mean (a) document existing isolation, or (b) add tests? Likely (a) — write a SECURITY.md and call out gaps

## Carryovers from Sprint 10

- The /admin/settings page is read-only; the "edit site name" + "maintenance mode" features are still pending (could be Sprint 11+)
- Prisma schema migrations for the new admin methods (create/update/archive on Course, Module, Lesson, DiscountCode, LiveClass, Badge, SimulatorScenario repos) — these are stubs and need Prisma implementations before production deploy

## One change from Sprint 10 retro

- Build the `pnpm gen:admin` CLI before Sprint 11. Sprint 11 won't add any new admin resources, so it's a clean window to do this. Pay it forward.
