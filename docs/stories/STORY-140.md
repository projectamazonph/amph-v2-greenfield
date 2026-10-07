# STORY-140: LEARN-034 — Save artefacts from tool debriefs

**Sprint:** Learning experience uplift, wave 3

**Points:** 2

**Epic:** Student experience (LEARN-034)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-034 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. The pieces exist but
are disconnected: `ToolDebrief` (LEARN-032) collects a rationale in
a textarea that goes nowhere, and `SaveArtefact` (LEARN-033) waits
for a caller. This story connects them so each practice activity
produces a named artefact with its scenario, rationale, and created
date.

## Goal

Add a "Save to portfolio" action in `ToolDebrief` that persists the
learner's rationale as a DRAFT artefact via `saveArtefactAction`,
with the simulator id mapped to the matching artefact kind and the
scenario passed through as `scenarioRef`. Wire the Bid Elevator
result view as the reference implementation; the other four
simulators adopt the same props in a follow-up.

## Scope

- `ToolDebrief` gains `artefactKind`, `scenarioRef`, and
  `courseId` props plus a "Save to portfolio" submit that calls
  `saveArtefactAction` with the textarea rationale. Success shows
  an inline confirmation linking to `/portfolio`; failure shows an
  inline error without losing the typed text.
- `BidElevatorResult` passes `artefactKind="decision-log"`,
  the published scenario name as `scenarioRef`, and
  `courseId={null}` (simulators are course-agnostic practice).
- The save is explicit (button press), never automatic: a learner
  who closes the result without saving loses nothing and breaks
  nothing.
- Component tests cover save-success, save-failure, and the
  empty-rationale guard (the button stays disabled until the
  textarea is non-blank).
- No new domain entity, no new port, no migration.

## Acceptance criteria

- A learner who types a rationale and clicks "Save to portfolio"
  gets a DRAFT `decision-log` artefact visible on `/portfolio`.
- A failed save shows an inline error and keeps the typed text.
- The button is disabled while the rationale is blank.
- The other four simulator result views are untouched.
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- Wiring the other four simulators (follow-up story reusing these
  props).
- Auto-submit on save (artefacts stay DRAFT until the learner
  submits from the portfolio or a future review flow).
- Module 5 reporting-assignment autosave (same pattern, separate
  story if requested).

## Dependencies

- LEARN-032 (STORY-136): `ToolDebrief` component.
- LEARN-033 (STORY-135): `saveArtefactAction` and the artefact
  domain.
- LEARN-035 (STORY-137): `/portfolio` renders the saved row.

## Verification

- Component tests cover save-success, save-failure, and the
  empty-rationale guard.
- Manual smoke: run a Bid Elevator attempt, type a rationale,
  save, open `/portfolio`, confirm the DRAFT decision-log row.
