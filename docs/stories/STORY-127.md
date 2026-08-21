# STORY-127: Add campaign maps and pre-flight rationales to Module 4

**Sprint:** Learning experience uplift, wave 2

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress.

## Context

This story supersedes the original STORY-122 ticket that landed with PR #395
on a stale USD-priced fork. STORY-122 has since been re-numbered in the
story index to track active lesson primitives (PR #420). To keep the story
numbering monotonic, this work ships under STORY-127 with the same content
scope and a PHP-aligned rationale example that matches the post-PR-417
Module 4 currency pass.

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
- Rationale examples are PHP-correct: 4.1 uses the phone tripod at ₱1,400
  total, 4.2 uses GreenKeep, 4.3 uses the garlic press at the established
  ₱55 / ₱18 / ₱15 bids, and 4.4 uses the portable blender at ₱1,750 and
  ₱1,600 budget with the ₱61 exact-match CPC ceiling.
- Existing practice, feedback, worksheet, fact-card, and client-language blocks
  remain intact.

## Verification

- All four Module 4 lessons contain `## Campaign map and pre-flight rationale`.
- The lesson-production report and release gate pass.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are
  required in CI.