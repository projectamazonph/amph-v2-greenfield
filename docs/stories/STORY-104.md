# STORY-104: Student journey reliability repair

**Sprint:** 16 follow-up

**Points:** 13

**Epic:** Student experience

**Owner:** Ryan

**Status:** In review

## Goal

Make the complete student journey functional and truthful from signup and
purchase through learning, practice, live classes, refunds, certificates, and
account export.

## Scope

- Persist lesson completion and progress idempotently.
- Enforce course access for quiz pages and submissions.
- Validate simulator scenarios and challenge prerequisites server-side.
- Require active course enrollment for live-class RSVP and recording progress.
- Preserve pricing-tier selection through signup and charge the authoritative
  linked offer price at checkout.
- Add student purchase history, refund requests, and certificate lists.
- Include quiz and simulator history in account data exports.
- Replace silent failures, misleading controls, invalid landmarks, nested
  interactive elements, and account-enumerating login messages.
- Add route boundaries and accessible mobile navigation behavior.

## Acceptance checks

- A student can enroll, complete a lesson, take a quiz, and receive persisted
  progress only when entitled to the course.
- Challenge mode cannot be unlocked by changing a client request.
- Live-class mutations reject users without active enrollment.
- Tier checkout and direct course checkout display and charge the same
  server-resolved total.
- Eligible paid orders accept one refund request; ineligible and foreign orders
  fail closed.
- Purchases, certificates, and complete JSON export are reachable from the
  student profile and sidebar.
- Every student route has one main landmark and visible error states.
- TypeScript, lint, full tests, coverage, migration contracts, and production
  build pass.

## Verification

- 3,795 tests passed and 2 were intentionally skipped.
- Coverage is 82.17% statements and 83.21% lines.
- Next.js production build completed all 94 routes.
- Local browser execution is blocked by the unavailable Chromium binary. The
  preview deployment must complete the desktop and mobile browser gate before
  merge.
