# STORY-136: LEARN-032 — Tool debrief pattern

**Sprint:** Learning experience uplift, wave 3

**Points:** 2

**Epic:** Student experience (LEARN-032)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-032 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. Simulator result views
today show the score and per-dimension feedback but stop there: the
learner cannot reach the relevant lesson, retry without losing the
attempt record, or state the rationale in their own words. The
debrief pattern closes that loop.

## Goal

Ship a `ToolDebrief` client component that every simulator result
view renders: the result summary, why it matters, a targeted lesson
revisit link, a retry link that preserves the completed attempt
record, and a prompt to state the rationale. Wire it into the Bid
Elevator result view as the reference implementation; the other
four simulators adopt it in LEARN-034.

## Scope

- `src/components/tools/ToolDebrief.tsx` client component with
  props: `simulatorId`, `scoreLabel`, `whyItMatters`,
  `lessonHref`, `lessonLabel`, `retryHref`, `rationalePrompt`.
- `ToolDebrief.module.css` using declared AMPH tokens only.
- Wire into `BidElevatorForm` result rendering (the one result view
  fully owned by this story). The other four simulators are
  explicitly out of scope until LEARN-034.
- Client-side tests for the component (renders all five sections,
  links point at the right hrefs, no job-readiness wording).
- The debrief never labels a simulator percentage as certification
  or hiring readiness (STORY-078 `FormativeScoreNotice` stays).

## Acceptance criteria

- A learner who finishes a Bid Elevator attempt sees: result, why
  it matters, lesson revisit link, retry link, rationale prompt.
- Clicking retry opens a fresh attempt; the completed attempt
  record is untouched.
- The rationale prompt is a labelled textarea, not a placeholder-only
  input (voice guide: real labels).
- No new domain entity, no new port, no migration.
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- Wiring the other four simulators (LEARN-034).
- Autosaving the rationale to an artefact (LEARN-034).
- Changing the scoring or feedback composer.

## Dependencies

- LEARN-030 bridge registry (lesson hrefs resolve to real routes).
- STORY-078 `FormativeScoreNotice` stays rendered above the debrief.

## Verification

- Component tests cover all five sections and both links.
- Manual smoke: run a Bid Elevator attempt, confirm the debrief
  renders with the lesson link, retry link, and rationale prompt.
