# Student-facing feature audit

**Last verified:** 2026-08-21 against `main` (`8988ac1`). The verified-journey table below was established 2026-08-17 against PRs #305-#308; merges since then (STORY-107 Phase 3 second half #417, audit cycle #418-#420, doc refresh #421, gitignore hygiene #422, doc-staleness sweep #423, S-1 QuizEditor `useRef` fix #424, round 32 audit pin #396, round 33 audit closure + `<Link>` swap #398) did not alter the student-facing surfaces in this table. Re-verification is due after the next student-journey change.

**Repository:** `amph-v2-greenfield`

**Implementation story:** `docs/stories/STORY-104.md`

**Curriculum tone remediation:** `docs/stories/STORY-107.md` (Phase 3 first half shipped 2026-08-17: voice template + $→₱ applied to all 5 Module 2 and Module 3 lessons. Phase 3 second half shipped 2026-08-21 in PR #417: same transforms applied to Modules 4-8, including 16 lessons, with a final-pass audit reporting zero USD, zero em-dashes, zero blockquote-header violations, and zero over-30-word body sentences across the 16 files).

This report replaces the 2026-08-01 gap queue. The previous open student
journey gaps were checked against the current routes, server actions, use cases,
repositories, schema, and tests. STORY-104 closes the application-level gaps
listed below. Environment-specific payment and browser checks remain release
verification, not missing product code.

PR #305 merged the repair at `9096cf4`. PR #306 then repaired manually granted
student access by creating eligible published-course enrollments. PR #307 fixed
the admin-login redirect cookie, and PR #308 fixed forgot-password links. The
2026-08-20 audit cycle closed on 2026-08-21 with PRs #417, #418, #419, and #420;
PR #421 refreshed STATE.md and CHANGELOG.md; PR #422 added `.qoder/` and
`package-lock.json` to `.gitignore`; PR #423 ran a doc-staleness sweep; PR #424
landed the S-1 `QuizEditor` `useRef` fix and rewrote the H-16 pin test (admin
mutation, not student-facing); PR #396 pinned C-02 / C-05 / C-06 / C-07 a11y
contracts; PR #398 swapped two raw `<a>` route links for `<Link>` and pinned
H-09 / H-11 / H-12 hygiene contracts (admin + student UI surfaces; verified-
journey table below unchanged because the affected routes already used
canonical semantics). The current post-merge gate on `main`
passes 3,901 Vitest tests with 3 skipped, 669 architecture checks, TypeScript,
ESLint, production build, Playwright, and Lighthouse.

## Verified student journeys

| Journey               | Current behavior                                                                                                                                                                                  | Verification                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Authentication        | Signup preserves the selected tier. Login uses generic public credential errors, enforces lockout, and validates server-side sessions. Password reset and opt-in 2FA have visible failure states. | Auth use-case, action, and route tests           |
| Course access         | Active enrollment, eligible subscription, or admin access grants the course. Public catalog and detail pages fail visibly when data cannot load.                                                  | Entitlement and course route tests               |
| Lesson progress       | A student can complete an entitled lesson once. Repeated submissions are idempotent and course progress is recalculated.                                                                          | `CompleteLesson` and action tests                |
| Quizzes               | Lesson links use `/courses/[slug]/quizzes/[quizId]`. The legacy URL redirects. Page load and submission both enforce course access.                                                               | Quiz route, action, and attempt tests            |
| Simulators            | All attempts use the authenticated student, validate the registered scenario, and enforce challenge prerequisites on the server.                                                                  | Simulator action and challenge-access tests      |
| Checkout              | Pricing tiers resolve their linked course server-side. Direct and tier checkout use one authoritative effective price, including early-bird pricing.                                              | Checkout action and pricing tests                |
| Live classes          | List, detail, RSVP, cancellation, recording access, watched state, and XP are implemented. Student mutations require active course enrollment.                                                    | Live-class route and action tests                |
| Purchases and refunds | `/profile/purchases` shows orders and refund state. Refund requests enforce ownership, paid status, the policy window, completion threshold, and idempotence.                                     | Refund use-case and action tests                 |
| Certificates          | `/certificates` lists the student's credentials. Public verification and PDF routes remain available.                                                                                             | Certificate route and repository tests           |
| Account data          | `/profile/data` exports profile, subscriptions, orders, enrollments, progress, quiz attempts, simulator attempts, badges, certificates, sessions, and audit data.                                 | Export use-case and page tests                   |
| Navigation and errors | Student routes use one main landmark, accessible mobile drawer behavior, headed error states, busy loading landmarks, announced mutation outcomes, and no nested interactive controls.            | Static regression scans, ESLint, and route tests |

## Verification snapshot

- TypeScript: pass.
- ESLint: pass.
- Full Vitest suite: 3,901 passing and 3 intentionally skipped.
- Student event boundary coverage is documented in
  `docs/STUDENT-EVENT-COVERAGE.md`.
- Architecture suite: 669 passing, including design-token and loading-state
  contracts.
- Next.js production build: pass.
- Prisma schema and migration contracts: pass in the full test suite.
- Playwright and Lighthouse: passed in GitHub CI.
- Coverage: 80.42% statements / 74.19% branches / 80.71% functions / 81.80% lines.

## Release verification still required

1. Let the GitHub and Vercel checks finish on the pull request.
2. Exercise the deployed preview at mobile and desktop widths.
3. Confirm a sandbox PayMongo checkout and webhook using deployment-managed
   credentials.
4. Confirm representative seeded subscriptions, enrollments, quizzes, live
   classes, refunds, and certificates in the target database.

These checks validate a particular deployment and its data. Failures found in
that gate must be fixed before merge; they are not silently treated as future
feature work.
