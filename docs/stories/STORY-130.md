# STORY-130: LEARN-010 — Optional pre-course diagnostic

**Sprint:** Learning experience uplift, wave 1

**Points:** 2

**Epic:** Student experience (LEARN-010)

**Owner:** Ryan

**Status:** Shipped (PR #521, commit `7d419a1a`, 2026-09-16). Persistence to a Prisma `UserDiagnosticResult` row and wiring the result into the dashboard next-action card are deferred to LEARN-052, which is its own story.

## Context

This story opens LEARN-010 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. The build plan explicitly
calls the diagnostic short, optional, and unable to gate paid content
or skip safety foundations. The acceptance evidence is a learner
identified as new, familiar, or experienced with a recommended starting
emphasis, not a change to entitlement.

## Goal

Let a logged-in learner answer three short questions about their
Amazon PPC background, then read the result as plain text plus a
recommended starting emphasis on the dashboard. The diagnostic is not
scored as a quiz and does not block the learner from any lesson,
tool, or course they would otherwise reach.

## Scope

What shipped in PR #521:

- Static diagnostic question set in `content/curriculum/diagnostic.json`
  with three questions and three fixed outcomes (new, familiar,
  experienced), plus a fallback rubric for partial or unmatched answers.
- Pure scoring function and manifest loader in `src/lib/diagnostic.ts`
  with no `node:fs` or framework dependency in the unit-test surface.
- `src/app/dashboard/diagnostic/page.tsx` (and `DiagnosticForm.tsx`)
  renders the question form and posts answers, gated on `requireAuth`
  so unauthenticated visits redirect to `/login`.
- `src/app/actions/diagnostic.action.ts` scores the answers against the
  rubric and redirects back to the page with the chosen outcome in the
  query string.
- `src/app/dashboard/diagnostic/loading.tsx` ships a `SkeletonCard`
  loading skeleton so the route matches the 64/64 loading-skeleton
  coverage target.
- Vitest coverage in `src/app/actions/__tests__/diagnostic.action.test.ts`
  exercises the manifest loader and the pure scoring rubric across the
  three outcomes, the partial-answer fallback, and the no-match fallback.

Deferred to LEARN-052 (separate story):

- The `User.diagnostic` JSON column and the `20260915000000_add_user_diagnostic`
  migration that persists the result on the user row.
- Wiring the latest result into the existing `/dashboard` page above
  the continue-learning card.
- Routing the diagnostic completion through the structured
  `learning_event:diagnostic_completed` logger event (LEARN-060). The
  shipped slice emits a `console.error('[learning_event] ...')` line;
  that is a known gap to be lifted to the structured logger in the
  LEARN-052 follow-up so the analytics adapter picks it up.

## Acceptance criteria

- [x] The diagnostic route is reachable from the dashboard only by an
      authenticated user; unauthenticated visits redirect to `/login`
      (`src/app/dashboard/diagnostic/page.tsx` calls `requireAuth()`
      before rendering).
- [x] The diagnostic page explains it is optional and that skipping it
      leaves the default "new learner" recommendation in place
      (`diagnostic.json` intro plus the result card's "Skipping this
      diagnostic keeps the default ..." footer).
- [x] Three outcomes exist (new, familiar, experienced); each maps to a
      plain-language recommended starting emphasis that does not
      change which modules or tools the learner can open
      (`diagnostic.json` rubric, `scoreDiagnostic` in
      `src/lib/diagnostic.ts`, `outcomeView` payload).
- [x] Submitting the diagnostic never changes entitlement: the outcome
      is rendered as plain-language recommendation only. Module 0 stays
      on the pathway and the safety-foundation prerequisite is enforced
      by the existing lesson access checks, not by the diagnostic.
- [x] The result is shown on the diagnostic page itself once the action
      redirects back with `?outcome=<id>`. Persistence on the user row
      plus the dashboard recommendation above the continue-learning card
      is LEARN-052, tracked separately.
- [x] The diagnostic completion emits an event line tagged
      `learning_event:diagnostic_completed` with the outcome but no
      answer-level content. The shipped slice logs it via
      `console.error`; LEARN-052 lifts this to the structured logger.
      The rubric itself is published in `diagnostic.json`; the answers
      stay in the FormData and are never written to a database row in
      this story.
- [x] Domain unit tests cover the three-outcome rubric
      (`src/app/actions/__tests__/diagnostic.action.test.ts`, 6 cases:
      manifest load, new outcome, experienced outcome, familiar outcome,
      partial-answer fallback, no-match fallback).
- [x] `pnpm typecheck && pnpm lint && pnpm test` green on `main` after
      PR #521 (test count after PR #521 was recorded at 5,208 passing).
      E2E Playwright coverage is not required for this first slice.

## Non-goals

- Skipping required lessons based on the result.
- Scoring the diagnostic as a quiz that grants XP or badges.
- Linking the result to refund, certificate, or job-readiness
  language. It is recommendation only.
- Replacing the existing module quizzes; the diagnostic is a separate
  artefact with its own question set.

## Dependencies

- LEARN-001 is already shipped (STORY-111, STORY-129); the dashboard
  reads the same `content/curriculum/` source-of-truth.
- LEARN-015 (onboarding completion view) and LEARN-052 (next-incomplete
  action on the dashboard) will reuse this diagnostic result. The
  result is currently held only in the redirect query string; LEARN-052
  is the story that adds the `User.diagnostic` column, the persistence
  path, the dashboard recommendation card, and the structured-logger
  wiring for `learning_event:diagnostic_completed`.

## Verification

- `pnpm test src/app/actions/__tests__/diagnostic.action.test.ts` is
  green: 6 tests, 1 file (verified on `main` after this doc-hygiene
  pass).
- The `/dashboard/diagnostic` route renders the form when no outcome
  is present in the URL and renders the plain-language result card
  when `?outcome=<id>` is set, with a "Back to dashboard" link to
  `/dashboard`.
- Manual smoke (not in CI): sign in, open `/dashboard/diagnostic`,
  submit three answers, follow the redirect, and confirm the result
  card renders with the expected emphasis text. The dashboard-level
  recommendation card is the LEARN-052 deliverable.
