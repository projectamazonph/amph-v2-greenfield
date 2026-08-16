# STORY-118 — Complete the Module 0 onboarding lesson pass

**Sprint:** Learning experience uplift, wave 2

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress on the Module 0 branch.

## Goal

Give a complete beginner a consistent first three lessons: clear decision
framing, a realistic attempt, feedback, and an honest map of the current course
offer.

## Scope

- Add the missing production blocks to `0.1-welcome.mdx` and
  `0.2-platform-tour.mdx`.
- Correct the welcome lesson's stale three-course claim; Ultimate Transformation
  is not part of the current public offer.
- Verify Module 0 against the strict lesson-production contract.

## Acceptance criteria

- All three Module 0 lessons satisfy the seven required production blocks.
- A new learner can practice an account-safety decision and a navigation choice,
  then compare the answer with direct feedback.
- Course availability language matches the reviewed public claims.

## Verification

- The source contract reports no missing blocks in Module 0.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are
  required in CI.
