# STORY-117 — Define the lintable lesson production contract

**Sprint:** Learning experience uplift, wave 2

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In review in PR #390.

## Goal

Give every lesson the same visible learning rhythm without forcing every lesson
into identical prose. Authors should know which blocks a beginner needs, and CI
should report the gaps before the lesson is treated as complete.

## Required blocks

- learner outcome
- job situation and one decision
- worked example
- active attempt
- feedback or answer reveal
- evidence instruction
- retrieval cue

## Scope

- Add `scripts/validate-lesson-production.ts` with a non-blocking migration
  report and a `--strict` mode for completed content slices.
- Run the report from the Learning release gate and upload its JSON artifact.
- Document the authoring contract next to the curriculum source and update the
  build plan.

## Acceptance criteria

- CI reports each lesson's missing required blocks without checking prose style
  mechanically.
- A future content branch can opt into `--strict` and fail on missing blocks.
- The report is explicit enough to drive the Module 0–8 production passes.

## Verification

- `pnpm validate:lesson-production` reports all 31 source lessons.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are
  required in CI.
