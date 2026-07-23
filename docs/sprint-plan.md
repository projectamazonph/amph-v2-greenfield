# Sprint Plan — Project Amazon PH Academy v2

**Date:** 2026-07-17 (greenfield)
**Owner:** Ryan Roland Dabao
**Status:** Day 0 — Sprint 1 ready to start

12 sprints, 60 stories, 60 points. One point per story. Sprint length: ~1 calendar week. Solo developer, single Vercel deploy, single Postgres.

The story mix is different from the legacy `amph-v2`: the SOLID architecture adds a foundation sprint (Sprint 1) and re-shapes the early sprints so the SOLID discipline is in place before any business logic lands.

---

## Sprint 1 — Foundation + First Vertical Slice (5 pts)

**Goal:** Lay the SOLID five-layer architecture. Ship one working vertical slice (signup → email verification → empty dashboard) with all the infrastructure it needs: ESLint boundary rules, Result type, Money, Clock, IdGenerator, Prisma, the first use case, the first server action, the first page, the first tests.

**Why now:** Every subsequent sprint is faster if the foundation is right. Adding the SOLID discipline on Sprint 5 (as the legacy repo did) is a 3-sprint refactor; adding it on Sprint 1 is a one-sprint setup cost.

**Stories:**

| ID        | Title                                                                          | Pts |
| --------- | ------------------------------------------------------------------------------ | --- |
| STORY-001 | Foundation: `Result` + `Money` + `Clock` + `IdGenerator` + ESLint boundary     | 1   |
| STORY-002 | Prisma schema + first repository (`UserRepository` + `InMemoryUserRepository`) | 1   |
| STORY-003 | First use case: `SignUp`                                                       | 1   |
| STORY-004 | First server action + first page: signup form                                  | 1   |
| STORY-005 | First end-to-end test: Playwright signup happy path                            | 1   |

See `docs/sprint-1/PLAN.md` for the detailed plan.

## Sprint 2 — Auth + Session (5 pts)

| ID        | Title                                                                 | Pts |
| --------- | --------------------------------------------------------------------- | --- |
| STORY-006 | SignIn, SignOut, JWT cookie                                           | 1   |
| STORY-007 | Email verification (token table, Resend email, verify route)          | 1   |
| STORY-008 | Password reset (request + confirm)                                    | 1   |
| STORY-009 | Middleware: request container + auth gate                             | 1   |
| STORY-010 | Auth unit + integration tests (buildTestContainer for every use case) | 1   | ✅ done — PR #119 |

## Sprint 3 — Course Catalog + Content Import (5 pts)

| ID        | Title                                                                                       | Pts |
| --------- | ------------------------------------------------------------------------------------------- | --- |
| STORY-011 | Course + Module + Lesson + PricingTier models + repos                                       | 1   | ✅ done — PR #132 |
| STORY-012 | MDX content renderer port + adapter                                                         | 1   | ✅ done — PR #134 |
| STORY-013 | Content import script (`scripts/import-amph-content.ts`) reading from `content/curriculum/` | 1   | ✅ done — PR #135 |
| STORY-014 | RSC catalog page (`/courses`) + course detail page                                          | 1   | ✅ done — PR #137 |
| STORY-015 | Pricing page (`/pricing`) with all-access pass + early-bird logic                           | 1   | ✅ done — PR #139 |

## Sprint 4 — PayMongo + Checkout (5 pts)

| ID        | Title                                                                     | Pts |
| --------- | ------------------------------------------------------------------------- | --- |
| STORY-016 | `PaymentGateway` port + `PayMongoGateway` adapter + `FakePayMongoGateway` | 1   | ✅ done (main, PR #140 wiring fix) |
| STORY-017 | `Checkout` + `Payment` models + repos                                     | 1   | ✅ done (main)                     |
| STORY-018 | `StartCheckout` use case + checkout server action + checkout page         | 1   | ✅ done (main)                     |
| STORY-019 | `HandlePaymentWebhook` use case + `/api/paymongo/webhook` route           | 1   | ✅ done (main)                     |
| STORY-020 | Receipt model + `IssueReceipt` use case + Resend email + PDF render       | 1   | ✅ done (main)                     |

## Sprint 5 — Enrollment + Access Policy (5 pts)

| ID        | Title                                                         | Pts |
| --------- | ------------------------------------------------------------- | --- |
| STORY-021 | `Enrollment` model + repo                                     | 1   | ✅ done (main) |
| STORY-022 | `AccessPolicy` port + `TierAccessPolicy` impl                 | 1   | ✅ done (main) |
| STORY-023 | `EnrollStudent` use case (called from webhook)                | 1   | ✅ done (main) |
| STORY-024 | Discount code model + repo + admin create + apply in checkout | 1   | ✅ done (main) |
| STORY-025 | `RequestRefund` use case + `/api/refunds` (in-window)         | 1   | ✅ done (main) |

## Sprint 6 — Lesson Delivery + Progress (5 pts)

| ID        | Title                                                                   | Pts |
| --------- | ----------------------------------------------------------------------- | --- |
| STORY-026 | Lesson page (RSC, MDX render)                                           | 1   |
| STORY-027 | `MarkLessonComplete` use case + `ProgressService` + `ProgressEvent` log | 1   |
| STORY-028 | `XPService` + XP display on dashboard                                   | 1   |
| STORY-029 | `StreakService` + streak visit recording on dashboard render            | 1   |
| STORY-030 | Module progress + next-lesson navigation + course completion view       | 1   |

## Sprint 7 — Quizzes + Badges (5 pts)

| ID        | Title                                                     | Pts |
| --------- | --------------------------------------------------------- | --- |
| STORY-031 | `Quiz` + `QuizAttempt` models + repos + admin quiz editor | 1   |
| STORY-032 | `RecordQuizAttempt` use case + quiz UI                    | 1   |
| STORY-033 | `Badge` + `BadgeAward` models + repos + admin badge CRUD  | 1   |
| STORY-034 | `AwardBadge` use case (criteria-checked)                  | 1   |
| STORY-035 | Badge display on dashboard + profile                      | 1   |

## Sprint 8 — Five Simulators (5 pts)

| ID        | Title                                                                                  | Pts |
| --------- | -------------------------------------------------------------------------------------- | --- |
| STORY-036 | `Simulator<TIn,TOut>` interface + `SimulatorRegistry` port + `SimulatorScenario` model | 1   | ✅ done (main) |
| STORY-037 | Bid Elevator (domain function + scenario JSON + UI + use case)                         | 1   | ✅ done (main) |
| STORY-038 | STR Triage                                                                             | 1   | ✅ done (main) |
| STORY-039 | Campaign Builder                                                                       | 1   | ✅ done (main) |
| STORY-040 | Listing Audit + Keyword Research (both in one story)                                   | 1   | ✅ done (main) |

## Sprint 9 — Certificates + Email Templates (5 pts)

| ID        | Title                                                                                                                      | Pts |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | --- |
| STORY-041 | `Certificate` model + repo + `IssueCertificate` use case                                                                   | 1   |
| STORY-042 | `ReactPdfRenderer` port + adapter + certificate PDF                                                                        | 1   |
| STORY-043 | `/certificates/[hash]` public view + `/pdf` route                                                                          | 1   |
| STORY-044 | `RevokeCertificate` on refund + revocation badge                                                                           | 1   |
| STORY-045 | `EmailSender` port consolidation + React Email templates (receipt, cert, refund, verification, reset, live class reminder) | 1   |

## Sprint 10 — Admin Panel (5 pts)

| ID         | Title                                                                                  | Pts |
| ---------- | -------------------------------------------------------------------------------------- | --- |
| STORY-046  | Admin layout + `requireAdmin()` + admin dashboard                                      | 1   |
| STORY-047  | Admin users list + user detail + impersonate                                           | 1   |
| STORY-048a | Admin courses CRUD (no modules/lessons editing yet)                                    | 1   |
| STORY-048b | Module domain + admin modules CRUD + reorder                                           | 1   |
| STORY-048c | Lesson domain + admin lessons CRUD + MDX editor                                        | 1   |
| STORY-049  | Admin payments + refunds + refund override                                             | 1   |
| STORY-050a | AuditLog port + InMemory adapter + write sites for refund override + admin course CRUD | 1   |
| STORY-050b | Simulators (scenario CRUD)                                                             | 1   |
| STORY-050c | Live classes (CRUD)                                                                    | 1   |
| STORY-050d | Discount codes (admin CRUD)                                                            | 1   | ✅  |
| STORY-050e | Badges (admin CRUD) + settings                                                         | 1   | ✅  |

**Sprint 10 closed: 11/11 stories merged.**

## Sprint 11 — Observability + Tests (5 pts)

| ID        | Title                                                                | Pts |
| --------- | -------------------------------------------------------------------- | --- |
| STORY-051 | Sentry setup (client/server/edge) + source maps                      | 1   |
| STORY-052 | Structured logging (Pino) + `withActionTracing` HOC + redaction      | 1   |
| STORY-053 | Lighthouse CI + Web Vitals                                           | 1   | ✅ done (job re-enabled, soft-pass) — PR #116 |
| STORY-054 | Rate limiting (Upstash) + fakes + applied at every documented bucket | 1   | ✅ done — PR #145                             |
| STORY-055 | Tenant isolation audit + 6 critical-journey E2E tests + axe a11y     | 1   | ? done - PR #146                              |

**Sprint 11 closed: 5/5 stories merged.**

## Sprint 12 — Launch (5 pts)

| ID        | Title                                                                        | Pts | Status                                                                                                  |
| --------- | ---------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------- |
| STORY-056 | Production deploy runbook + smoke script + env-var checklist                 | 1   | ✅ done (env vars synced, smoke script in `SESSION-HANDOVER.md`, runbook lived through PR #150)         |
| STORY-057 | DB backup + restore drill + cron                                             | 1   | ⏳ operator-owned (Neon has automatic backups, drill not yet run)                                       |
| STORY-058 | Pre-launch security audit (npm audit, gitleaks, headers, isolation)          | 1   | ⏳ operator-owned                                                                                       |
| STORY-059 | Production deploy (operator executes the runbook)                            | 1   | ✅ done (Vercel auto-deployed `https://amph-v2-greenfield.vercel.app` after PR #150; all 4 routes live) |
| STORY-060 | Launch communications (Facebook, LinkedIn, Resend broadcast, internal Slack) | 1   | ⏳ operator-owned                                                                                       |

**Sprint 12 in progress: 2/5 stories done (STORY-056, STORY-059). 3/5 operator-owned.**

**Production status (2026-07-24):**

- URL: `https://amph-v2-greenfield.vercel.app`
- Database: Neon Postgres, all 12 migrations applied, 4 pricing tiers seeded
- Smoke tests: `/` → 200, `/signup` → 200, `/login` → 200, `/dashboard` → 307 (redirect)
- Remaining operator items: PayMongo webhook endpoint, first admin user, custom domain, full signup→checkout smoke test, DB backup/restore drill, security audit, launch comms.

---

## Capacity & Velocity Context

| Sprint    | Pts    | Story pattern                                                                                                                                      |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1        | 5      | Foundation + first vertical slice (5 × 1pt)                                                                                                        |
| S2        | 5      | Auth (5 × 1pt)                                                                                                                                     |
| S3        | 5      | Catalog + content (5 × 1pt)                                                                                                                        |
| S4        | 5      | PayMongo + checkout (5 × 1pt)                                                                                                                      |
| S5        | 5      | Enrollment + access + refund (5 × 1pt)                                                                                                             |
| S6        | 5      | Lessons + progress (5 × 1pt)                                                                                                                       |
| S7        | 5      | Quizzes + badges (5 × 1pt)                                                                                                                         |
| S8        | 5      | Simulators (5 × 1pt; STORY-040 packs 2)                                                                                                            |
| S9        | 5      | Certificates + email (5 × 1pt)                                                                                                                     |
| S10       | 5      | Admin (STORY-046, 047, 048a, 048b, 048c, 049, 050a, 050b, 050c, 050d, 050e = 11 × 1pt; STORY-048 split into a/b/c, STORY-050 split into a/b/c/d/e) |
| S11       | 5      | Observability + tests (5 × 1pt)                                                                                                                    |
| S12       | 5      | Launch (5 × 1pt)                                                                                                                                   |
| **Total** | **60** |                                                                                                                                                    |

Per-sprint velocity: 5 points. The pack-stories (STORY-040, STORY-050) are honest about the larger scope; if they prove too big, split during planning. STORY-048 and STORY-050 were both split into multiple 1-pt stories to keep each PR within budget.

## Definition of Done (per story)

- [ ] Code: the listed files are created or modified, per the story's "Code shape" section.
- [ ] Tests: unit tests for domain functions, use-case tests with `buildTestContainer()`, integration test for the new adapter if applicable, e2e test if it's a user-facing flow.
- [ ] Lint: `pnpm lint` passes (boundary rules, voice, no-ai-slop, no-ai-packages).
- [ ] Typecheck: `pnpm tsc --noEmit` passes.
- [ ] Coverage: meets the per-layer thresholds in `docs/build-spec.md` §"Coverage gates".
- [ ] Docs: `docs/stories/STORY-XXX.md` updated if acceptance criteria changed.
- [ ] Conventional commit: `feat(<area>): <title> (STORY-XXX)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated with the story's completion, the commit SHA, any follow-ups.

## When a Story Splits

If a story's "Code shape" section is more than ~150 lines of new code, split it. The 1-point-per-story rule is the discipline. A 1-point story should take ~1 working day.

If a story's "Pitfalls" section has more than 3 items, it is under-scoped. Add the pitfalls as a checklist of follow-up stories; do not silently absorb them.

## Sprint Review (end of each sprint)

- [ ] All 5 stories merged.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:coverage && pnpm build` all green.
- [ ] Lighthouse CI green on `main`.
- [ ] `docs/sprint-N/PLAN.md` exists for the next sprint (or `docs/sprint-N+1/` is at least drafted).
- [ ] `SESSION-HANDOVER.md` updated with the closing notes.
- [ ] Memoria T1 semantic memory stored.
- [ ] Demo or walkthrough written into the sprint plan's "Done" section.

## Sprint Retrospective (every sprint, 15 minutes)

Three questions:

1. What went slower than expected? Was it a story-scoped thing or a process thing?
2. What went faster than expected? Was the story over-scoped, or did we get lucky?
3. What is one change to make next sprint? (Pick one. Implement it. Don't pick three.)

Outputs go into `docs/sprint-N/RETRO.md` (created starting Sprint 2).
