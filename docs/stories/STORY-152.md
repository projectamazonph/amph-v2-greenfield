# STORY-152: Module -1 gets its knowledge check

**Status:** merged in PR #556
**Depends on:** STORY-151 (both curriculum maps already carry Module -1)
**Decision owner:** Ryan, 2026-09-23. Asked whether Module -1 should have a quiz given it is the
only module awarding XP with nothing checkable behind it. He chose to add a four question quiz.

## The gap

`8f09801` (PR #549) added the Amazon primer as Module -1: three lessons, 28 minutes, 150 XP. It
wired the lessons into the inventory, the landing page, the course page and the dashboards. It did
not add a module-final quiz, so Module -1 became the only module in the course whose XP a learner
can bank without answering anything.

STORY-151 recorded that honestly in both curriculum maps rather than inventing a quiz. This story
closes it.

## What was added

A `moduleNumber: -1` entry at the head of `content/curriculum/quiz-questions.json`, titled "Amazon
and the PPC Job Knowledge Check", four questions:

| # | Asks | Lesson |
| --- | --- | --- |
| 1 | Which level of the object model controls the daily budget | `-1.3` |
| 2 | Which surface a PPC VA actually works in, and what lives there | `-1.2` |
| 3 | Where a clicked shopper lands and when the seller pays | `-1.1` and `-1.2` |
| 4 | Which two Amazon fees come off a 3P FBA sale before ad spend | `-1.1` |

Each question is a module-level restatement of that lesson's own Quick Check item, not a copy of
it, so the quiz tests retention rather than recognition of text seen five minutes earlier. No
question states a peso amount, a fee percentage or a bid band, so nothing here depends on a fact
card that still lacks a `Last verified` date.

The bank goes from 12 quizzes and 83 questions to 13 quizzes and 87 questions.

## Why no code changed

Two things were already ready for this:

- `scripts/seed-all-content.mjs:308` maps `moduleNumber >= -1 && moduleNumber <= 4` to
  `ppc-foundations`, and keys the quiz on `(courseSlug, moduleNumber)`, so the primer quiz seeds
  into the Foundations course with no migration.
- `src/app/courses/[slug]/page.tsx:354` renders the Knowledge checks list by mapping whatever
  quizzes the course detail returns. The new quiz appears for a learner on the next content seed,
  because that script deletes and recreates each quiz's questions per run.

## Count claims fixed in the same pass

`PR #551` left the module and lesson totals stale in documents outside the two curriculum maps.
Corrected here, in the same commit that changes the quiz count, so no document in the repo claims
a number the content does not back:

- `content/CURRICULUM-INDEX.md`: total line and the quiz paragraph
- `CURRICULUM-SYLLABUS.md`: the assessment line and the current-state line
- `content/README.md`: the tree comment, the "all modules present" check, and the quiz count in
  the import instructions
- `docs/DOCUMENTATION-STATUS.md`: claimed 12 modules, 42 lessons, and Foundations as modules 0-4
- `docs/CURRICULUM-SYNC-SPEC.md`, `docs/curriculum-improvement-research.md`,
  `docs/ui-specs/STITCH-PROMPTS.md`: their status notes asserted 12 and 42 as current fact

The guard test added in STORY-151 reads the quiz count from the bank itself,
`src/domain/curriculum/__tests__/CurriculumDocCounts.test.ts:108`, so the index total line is now
pinned to 13 automatically. If someone deletes a quiz without updating the document, it fails.

## Verification

- Parsed the bank before and after: 13 quizzes, 87 questions, module numbers
  `-1,0,1,2,3,4,5,6,7,8,9,10,11`, every question has four non-empty options and an `A` to `D`
  key, and the field set matches the existing questions exactly
- `git diff` on the bank is 47 insertions and 0 deletions, which proves the existing 83 questions
  are byte-identical
- `pnpm validate:lesson-production`, `validate:curriculum`, `validate:learning-release`,
  `typecheck`, `lint`, and the full Vitest suite: see PR #556 checks

## Out of scope

Module -1's quiz is graded, but the module is still not part of any certificate or job-readiness
claim. Simulator scores remain formative.
