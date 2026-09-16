# STORY-130: LEARN-010 — Optional pre-course diagnostic

**Sprint:** Learning experience uplift, wave 1

**Points:** 2

**Epic:** Student experience (LEARN-010)

**Owner:** Ryan

**Status:** Planned.

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

- Add a static diagnostic question set in `content/curriculum/diagnostic.json`
  with three questions and three fixed outcomes (new, familiar,
  experienced).
- Add `src/app/dashboard/diagnostic/page.tsx` that renders the question
  form and posts answers.
- Add `src/app/actions/diagnostic.action.ts` that scores the answers
  against the fixed rubric and stores the result on the
  `UserDiagnosticResult` Prisma row.
- Add `User.diagnostic` JSON column through a new Prisma migration
  (`20260915000000_add_user_diagnostic`). Keep the column optional so
  existing users are not forced to answer.
- Display the latest diagnostic result and recommended emphasis on the
  existing `/dashboard` page when a result exists.
- Record the diagnostic-completion learning event through the existing
  structured logger so R6 measurement work has data to aggregate
  against (LEARN-060).

## Acceptance criteria

- [ ] The diagnostic route is reachable from the dashboard only by an
      authenticated user; unauthenticated visits redirect to `/login`.
- [ ] The diagnostic page explains it is optional and that skipping it
      leaves the default "new learner" recommendation in place.
- [ ] Three outcomes exist (new, familiar, experienced); each maps to a
      plain-language recommended starting emphasis that does not
      change which modules or tools the learner can open.
- [ ] Submitting the diagnostic never changes entitlement: a learner
      who answers "experienced" still sees Module 0 in their pathway
      and is still required to complete the safety foundations before
      the capstone.
- [ ] The result persists on the user row and is shown on the
      dashboard above the existing "continue learning" card.
- [ ] The diagnostic completion emits a structured log event tagged
      `learning_event:diagnostic_completed` with the outcome but no
      answer-level content (the rubric itself is published; the
      answers stay private to the learner).
- [ ] Domain unit tests cover the three-outcome rubric. Action-level
      tests cover the persistence path with the in-memory user repo.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green. E2E
      Playwright coverage is not required for the first slice.

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
- LEARN-015 (onboarding completion view) will reuse this diagnostic
  result to recommend the next action after Module 0.

## Verification

- `pnpm test` includes the new domain and action tests.
- The dashboard renders the diagnostic recommendation above the
  continue-learning card for a user who has submitted the form, and
  hides the recommendation for a user who has not.
- Manual smoke: sign in, open `/dashboard/diagnostic`, submit three
  answers, return to `/dashboard`, and confirm the recommendation
  appears with the expected emphasis text.
