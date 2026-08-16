# STORY-121: Add listing-audit rationales to Module 3

**Sprint:** Learning experience uplift, wave 2

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In review in PR #394.

## Goal

Move a beginner from checking listing fields to explaining whether a listing is
ready for ad spend and what evidence supports that recommendation.

## Scope

- Add a concrete audit-rationale output to all three Module 3 lessons.
- Require the learner to record evidence, a decision, a reason, and a follow-up
  validation check.
- Update the build plan, feature inventory, and changelog.

## Acceptance criteria

- Each Module 3 lesson ends with a usable listing-audit rationale.
- The rationale connects observed listing or performance evidence to the
  learner's recommendation.
- Existing practice, feedback, worksheet, and client-language blocks remain
  intact.

## Verification

- All three Module 3 lessons contain `## Listing audit rationale`.
- The lesson-production report and release gate pass.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are
  required in CI.
