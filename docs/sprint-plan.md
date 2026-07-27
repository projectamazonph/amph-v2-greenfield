# Sprint Plan — Project Amazon PH Academy v2

**Reviewed:** 2026-07-27  
**Owner:** Ryan Roland Dabao  
**Status:** Sprints 1–13 implementation is present in the repository. Sprint 12 has operator-owned launch work; Sprints 14–16 are planned simulator remediation. See `docs/audit-2026-07-27-completeness-review.md` for the source audit.

This plan began as a 12-sprint greenfield plan. The repository has since grown to 16 planned sprints and 89 tracked stories (including the simulator remediation sequence). Historical sprint goals remain below, but a story marked done here must still be checked against its current source and story file.

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

**Sprint 12 status:** STORY-056 and STORY-059 are recorded as complete in the historical plan. STORY-057, STORY-058, and STORY-060 remain operator-owned. The repository now contains 20 migrations and a `db:seed:admin` script; the deployment, database contents, webhook registration, and launch communications were not independently verified in the 2026-07-27 repository audit.

**Production reference:** `SESSION-HANDOVER.md` contains the operator-reported deployment notes. Treat them as operational handoff material, not as a substitute for a live smoke test.

## Sprint 13 — Admin panel and assessment infrastructure

The original Sprint 13 table was written before the work landed. The current repository snapshot is:

| Story     | Current state                                    | Evidence                                                                                                                                                   |
| --------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STORY-061 | ✅ Implemented                                   | `/admin/audit-log`, `/admin/audit-log/export`, `ListAuditLogs`, and `ExportAuditLogs` are present.                                                         |
| STORY-062 | ✅ Implemented                                   | `/admin/refunds`, `/admin/refunds/[orderId]`, list/process actions, and use cases are present.                                                             |
| STORY-063 | ◐ Backend partial                                | `EmailTemplate` entity, Prisma adapter, repository, and use cases are present; the documented admin email-template pages and actions are not in `src/app`. |
| STORY-064 | ◐ Implemented in source, story file missing      | Simulator attempt persistence and lifecycle classes are wired, but no `docs/stories/STORY-064.md` is tracked on this branch.                               |
| STORY-065 | ◐ Implemented in source, story status needs sync | Score policies and grading use cases are wired; the story document still needs a current status note.                                                      |
| STORY-066 | ✅ Implemented in source                         | Feedback composer and remediation use case are wired and tested.                                                                                           |
| STORY-067 | ✅ Implemented in source                         | STR Triage graded attempt action and simulator scoring are present.                                                                                        |
| STORY-068 | ✅ Implemented in source                         | Bid Elevator graded attempt action and simulator scoring are present.                                                                                      |
| STORY-069 | ✅ Implemented in source                         | Campaign Builder graded attempt action and simulator scoring are present.                                                                                  |
| STORY-070 | ✅ Implemented in source, story file missing     | Listing Audit graded attempt action and simulator scoring are present, but no `docs/stories/STORY-070.md` is tracked on this branch.                       |

The assessment stories remain partial from a product-completeness perspective. The four graded actions currently use `userId: "system"`, and the simulator accuracy audit says scores must not drive certification or hiring decisions.

## Sprint 14 — Simulator scoring integrity (7 pts)

**Goal:** Make the grade mean something before improving what it grades. Today a
learner can pass every Listing Audit difficulty by clicking "fix" on every
finding without reading one, four policies cap a flawless learner at 90, and
`passingThreshold` is seeded config that no code reads.

**Why now:** Every item here is mechanical and provable against invariants the
domain layer already declares. None of it needs an Amazon PPC judgement call, and
all of it is wasted work if done _after_ the subject-matter sprint reshapes the
dimensions. Full evidence in `docs/audit-2026-07-26-simulator-accuracy-review.md`.

**Honest limit:** this sprint blocks the click-through bypass on beginner and cuts
blind guessing from ~89% to ~11-19%, but it does **not** close the bypass on
intermediate/advanced. The residual cause is the binary ground truth itself, which
is STORY-083. Measured numbers are in the audit doc.

| ID        | Title                                                                                                                                                     | Pts | Status     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------- |
| STORY-071 | Remove `explanation` from all score policies; rebalance weights to sum 1.0                                                                                | 1   | ⏳ Planned |
| STORY-072 | Stop grading completion: `reviewCoverage` becomes a submission gate, not a weight                                                                         | 1   | ⏳ Planned |
| STORY-073 | `priorityCoverage` penalises false positives (recall to F1)                                                                                               | 1   | ⏳ Planned |
| STORY-074 | Enforce policy validation on the seed + hydration paths (`isValidPolicy`)                                                                                 | 1   | ⏳ Planned |
| STORY-075 | Resolve dead `passingThreshold`: implement partial credit or remove it                                                                                    | 1   | ⏳ Planned |
| STORY-076 | Rename `dataSufficiency` → `reviewCoverage` (both sims); Listing Audit's `profitability` → `priorityCoverage` (STR Triage's is correctly named, leave it) | 1   | ⏳ Planned |
| STORY-077 | Fix the inverted backend search-terms rule in `ListingAuditSimulator`                                                                                     | 1   | ⏳ Planned |

## Sprint 15 — Certification Safety + Subject-Matter Accuracy (7 pts)

**Goal:** Stop simulator scores implying job-readiness they cannot support, then
replace synthetic ground truth with real Amazon PPC logic.

**Owner note:** STORY-079 through STORY-084 require Ryan's Amazon PPC expertise to
define correct answers. These are explicitly **not** delegable to an agent. An
agent inventing plausible-looking ground truth is the exact defect this sprint
exists to remove.

| ID        | Title                                                                          | Pts | Status     |
| --------- | ------------------------------------------------------------------------------ | --- | ---------- |
| STORY-078 | Mark simulator results formative; block from certification/job-readiness       | 1   | ⏳ Planned |
| STORY-079 | Rewrite Bid Elevator economic model (highest-risk simulator)                   | 1   | ⏳ Planned |
| STORY-080 | Replace length-based listing scoring with a real rubric                        | 1   | ⏳ Planned |
| STORY-081 | Versioned keyword scenario datasets; split Listing Audit from Keyword Research | 1   | ⏳ Planned |
| STORY-082 | Expand STR Triage classifier (thresholds, relevance, match precision)          | 1   | ⏳ Planned |
| STORY-083 | Non-binary, category-aware Listing Audit ground truth (closes the bypass)      | 1   | ⏳ Planned |
| STORY-084 | Campaign Builder strategic scoring (negatives, isolation, reconciliation)      | 1   | ⏳ Planned |

## Sprint 16 — Assessment Platform Maturity (5 pts)

| ID        | Title                                             | Pts | Status     |
| --------- | ------------------------------------------------- | --- | ---------- |
| STORY-085 | Scenario publishing + versioning                  | 1   | ⏳ Planned |
| STORY-086 | Instructor calibration + acceptable-answer ranges | 1   | ⏳ Planned |
| STORY-087 | Explicit business-impact feedback                 | 1   | ⏳ Planned |
| STORY-088 | Challenge progression                             | 1   | ⏳ Planned |
| STORY-089 | Connected-account simulator                       | 1   | ⏳ Planned |

---

| Sprint    | Pts     | Story pattern                                                                                                                                      |
| --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1        | 5       | Foundation + first vertical slice (5 × 1pt)                                                                                                        |
| S2        | 5       | Auth (5 × 1pt)                                                                                                                                     |
| S3        | 5       | Catalog + content (5 × 1pt)                                                                                                                        |
| S4        | 5       | PayMongo + checkout (5 × 1pt)                                                                                                                      |
| S5        | 5       | Enrollment + access + refund (5 × 1pt)                                                                                                             |
| S6        | 5       | Lessons + progress (5 × 1pt)                                                                                                                       |
| S7        | 5       | Quizzes + badges (5 × 1pt)                                                                                                                         |
| S8        | 5       | Simulators (5 × 1pt; STORY-040 packs 2)                                                                                                            |
| S9        | 5       | Certificates + email (5 × 1pt)                                                                                                                     |
| S10       | 5       | Admin (STORY-046, 047, 048a, 048b, 048c, 049, 050a, 050b, 050c, 050d, 050e = 11 × 1pt; STORY-048 split into a/b/c, STORY-050 split into a/b/c/d/e) |
| S11       | 5       | Observability + tests (5 × 1pt)                                                                                                                    |
| S12       | 5       | Launch (5 × 1pt)                                                                                                                                   |
| S13       | 5       | Admin panel round 2 (STORY-061, 062, 063 = 3 × 1pt; add more stories as planned)                                                                   |
| S14       | 7       | Simulator scoring integrity (STORY-071–077 = 7 × 1pt; mechanical, no PPC judgement)                                                                |
| S15       | 7       | Certification safety + subject-matter accuracy (STORY-078–084 = 7 × 1pt; 079–084 need Ryan's PPC expertise)                                        |
| S16       | 5       | Assessment platform maturity (STORY-085–089 = 5 × 1pt)                                                                                             |
| **Total** | **60+** |                                                                                                                                                    |

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
