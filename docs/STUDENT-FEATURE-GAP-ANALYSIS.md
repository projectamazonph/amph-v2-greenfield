# Student-facing feature audit

**Last verified:** 2026-08-10

**Repository:** `amph-v2-greenfield`

**Implementation story:** `docs/stories/STORY-104.md`

This report replaces the 2026-08-01 gap queue. The previous open student
journey gaps were checked against the current routes, server actions, use cases,
repositories, schema, and tests. STORY-104 closes the application-level gaps
listed below. Environment-specific payment and browser checks remain release
verification, not missing product code.

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
| Navigation and errors | Student routes use one main landmark, accessible mobile drawer behavior, visible pending and error states, and no nested interactive controls.                                                    | Static regression scans, ESLint, and route tests |

## Verification snapshot

- TypeScript: pass.
- ESLint: pass.
- Full Vitest suite: 3,795 passing and 2 intentionally skipped.
- Coverage: 82.17% statements, 76.69% branches, 82.83% functions, and 83.21%
  lines.
- Next.js production build: pass with 94 application routes.
- Prisma schema and migration contracts: pass in the full test suite.
- Local Playwright browser launch: blocked because Chromium is unavailable and
  the restricted workspace network returns an empty browser archive.

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
