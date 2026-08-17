# STORY-119 — Add independent calculations to Module 1

**Sprint:** Learning experience uplift, wave 2

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In review in PR #392.

## Goal

Make the quantitative foundation usable for a zero-knowledge learner: first
watch a calculation, then perform a fresh one without copying the example.

## Scope

- Add an explicit independent-calculation cue to all five Module 1 lessons.
- Keep the existing worked examples, answer reveals, worksheets, and client
  language intact.
- Update the build plan and changelog.

## Acceptance criteria

- Every Module 1 lesson separates its worked calculation from a fresh learner
  calculation or diagnosis.
- The cue tells the learner to show the formula and explain the decision, not
  only produce a number.
- Existing production-contract blocks remain present.

## Verification

- All five Module 1 lessons contain `## Independent calculation` and `## Your turn`.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are
  required in CI.
