# STORY-104: Student journey reliability repair

**Sprint:** 16 follow-up

**Points:** 13

**Epic:** Student experience

**Owner:** Ryan

**Status:** Done. Merged in PR #305 (`9096cf4`) on 2026-08-12.

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

Post-merge follow-ups are PR #306 (manual grant enrollments), PR #307 (admin
redirect cookie), and PR #308 (password-reset URL normalization). Current gate:
3,816 Vitest passed, 2 skipped; 665 architecture checks; TypeScript, ESLint,
production build, Playwright, and Lighthouse passed.

- The PR #305 gate passed 3,804 tests with 2 skipped. The current post-follow-up
  gate passes 3,848 tests with 2 skipped. Student event boundary coverage is
  documented in `docs/STUDENT-EVENT-COVERAGE.md`.
- All 665 architecture checks passed, including design-token, loading-state,
  landmark, heading, and client-feedback contracts.
- Next.js production build completed all 94 routes.
- TypeScript and ESLint completed without errors.
- Playwright and Lighthouse passed before merge.
