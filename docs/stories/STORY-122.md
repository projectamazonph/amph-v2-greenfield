# STORY-122: Add campaign maps and pre-flight rationales to Module 4

**Sprint:** Learning experience uplift, wave 2

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In review in PR #395.

## Goal

Move a beginner from making isolated targeting choices to producing the written
campaign map they can review before opening Campaign Builder.

## Scope

- Add a campaign-map and pre-flight-rationale output to all four Module 4
  lessons.
- Require campaign purpose, target ownership, budget or eligibility constraints,
  negatives, and a review trigger where each applies.
- Update the build plan, feature inventory, and changelog.

## Acceptance criteria

- Each Module 4 lesson adds its decision to a usable campaign map.
- Every map includes a rationale that makes the launch or hold decision clear.
- The final lesson produces enough detail for another PPC VA to build the plan
  without guessing.
- Existing practice, feedback, worksheet, fact-card, and client-language blocks
  remain intact.

## Verification

- All four Module 4 lessons contain `## Campaign map and pre-flight rationale`.
- The lesson-production report and release gate pass.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are
  required in CI.
