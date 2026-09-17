# STORY-141: LEARN-041 — Targeted remediation on failed module quizzes

**Sprint:** Learning experience uplift, wave 4

**Points:** 2

**Epic:** Student experience (LEARN-041)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-041 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. A learner who fails a
module-final quiz today sees only the score and a generic "try
again" message. The build plan calls for review advice derived from
question tags, not generic copy, with the right lessons and
practice items to revisit.

## Goal

Tag every quiz question with the lesson slugs it depends on
(`remediationRefs`), add a `BuildQuizRemediationPlan` use case that
surfaces the union of those slugs for the questions the learner
got wrong, and wire the plan into the existing
`/courses/[slug]/quizzes/[quizId]` result view as a "What to
revisit" list. Tags are optional: a question with no tags
contributes nothing to the plan, never blocks the score.

## Scope

- `QuizQuestion` gains `readonly remediationRefs: readonly string[]`
  (default `[]`). Domain factory accepts and trims a slug list.
- Prisma `quiz_questions.remediationRefs` JSON column + migration
  with `deletedAt`, `createdById`, `updatedById`. Read path in the
  Prisma adapter maps JSON to `string[]`.
- `BuildQuizRemediationPlan` pure function: takes the quiz, the
  attempt answers, the correct-answer map; returns one entry per
  missed question (lesson slugs from `remediationRefs`, deduped,
  sorted, with the question text).
- `GetQuizAttemptRemediation` use case wires the plan on top of the
  existing `GetQuizAttempt` and `GetQuiz` reads; owner-scoped by
  userId.
- `/courses/[slug]/quizzes/[quizId]` result renders the plan as a
  bulleted list with a "Re-read" link per slug. Existing copy and
  pass/fail path are untouched.
- Domain unit tests cover tagging, dedup, sort, and the empty-tags
  no-op. Action tests cover the wired path.
- `pnpm validate:curriculum` still passes; no lesson content
  changes.

## Acceptance criteria

- A learner who misses questions with `remediationRefs=["1.2-cpc-ctr"]`
  sees "Re-read 1.2 CPC and CTR" with a link to the lesson.
- A learner who misses only questions with empty `remediationRefs`
  sees no list (no error, no extra noise).
- A learner who passes the quiz never sees the list.
- Question text and slug are stable across migrations.
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- Auto-remediation routing (LEARN-061, R6 measurement).
- Admin authoring UI for remediation tags (the JSON column is
  populated by the seed script or admin tooling; no new admin page).
- Re-doing any module-quiz content (no MDX changes).

## Dependencies

- LEARN-040 (STORY-138): quiz attempt lifecycle is already wired.

## Verification

- Domain unit tests (100% branch on the plan builder).
- Use-case tests via `buildTestContainer()`.
- Manual smoke: take a Module 1 quiz, miss a question, see the
  revisit list on the result page, follow the link to the lesson.
