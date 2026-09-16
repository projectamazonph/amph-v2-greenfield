# STORY-138: LEARN-040 — Tracked mid-lesson retrieval check

**Sprint:** Learning experience uplift, wave 4

**Points:** 2

**Epic:** Student experience (LEARN-040)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-040 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. The `SelfCheck`
component already gives immediate explanation client-side but
explicitly persists nothing ("selection is NOT persisted (no
localStorage, no DB)"). The build plan calls for one tracked
retrieval check in the production schema, shipped in Module 1 as
the reference implementation, that never blocks the learner for
one mistake.

## Goal

Add a `RetrievalCheckAttempt` log row (who, which lesson, which
check, correct or not, when), a `RecordRetrievalCheck` use case,
and a best-effort call from `SelfCheck` on submit. A failed write
never blocks the explanation: the UI shows correct/incorrect from
local state first, then fires the record call without awaiting it.

## Scope

- Prisma model `retrieval_check_attempts` + migration with
  `deletedAt`, `createdById`, `updatedById`.
- `IRetrievalCheckRepository` port: `record`, `listByUserAndLesson`.
- `PrismaRetrievalCheckRepository` + `InMemoryRetrievalCheckRepository`.
- `RecordRetrievalCheck` use case (validates lesson slug + check id,
  persists the row, returns the id).
- `recordRetrievalCheckAction` server action (session user only).
- `SelfCheck` fires the action on submit via `fetch` without
  awaiting; failures are swallowed (console.debug only in dev).
- Wire into `buildContainer()` and `buildTestContainer()`.
- Module 1 ships as the reference: every Module 1 `SelfCheck`
  already carries an `id`, so no content change is required — the
  component change covers all five lessons at once.
- Use-case tests via `buildTestContainer()`.

## Acceptance criteria

- Answering a Module 1 SelfCheck writes one
  `RetrievalCheckAttempt` row with the caller's userId, the lesson
  slug, the check id, and the correct flag.
- A failed write does not change the explanation the learner sees
  and does not throw to the UI.
- Answering incorrectly never blocks the learner from continuing
  the lesson.
- The attempt appears in the student's account-data export
  (LEARN-060 contract extension).
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- Gating lesson completion on retrieval-check correctness.
- XP or badges for retrieval checks.
- Remediation routing (LEARN-041, separate story).
- Changing the SelfCheck visual design.

## Dependencies

- LEARN-020 production schema (the `retrieval` block and
  `SelfCheck` component already exist).

## Verification

- Use-case tests cover record + list paths.
- Manual smoke: sign in, open a Module 1 lesson, answer a
  SelfCheck, confirm one row in `retrieval_check_attempts` with
  the right userId/lessonSlug/checkId/correct flag.
