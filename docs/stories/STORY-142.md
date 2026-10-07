# STORY-142: LEARN-042 — Foundations capstone brief and rubric

**Sprint:** Learning experience uplift, wave 4

**Points:** 2

**Epic:** Student experience (LEARN-042)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-042 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. The artefact domain
(LEARN-033), the portfolio page (LEARN-035), and the save-from-
debrief wiring (LEARN-034) all ship. What is missing is the
definition of done for the Foundations journey: which artefacts
prove the learner can do the job, and what the reviewer scores
them against.

## Goal

Ship a machine-readable capstone brief
(`content/curriculum/capstone.json`) requiring six artefacts —
listing audit, keyword plan, campaign map, bid guardrail, triage
decision, weekly client update — plus a rubric with one criterion
per artefact (what good looks like, max points, pass threshold)
and a pure readiness checker that maps a student's submitted
artefacts against the required kinds.

## Scope

- `content/curriculum/capstone.json` with the brief (title, intro,
  six required deliverables with the artefact kind each maps to)
  and the rubric (six criteria, 0–2 points each, pass at 9/12).
- `src/lib/capstone.ts` pure loader plus
  `checkCapstoneReadiness(submittedKinds)` returning
  `{ ready, missingKinds, submittedKinds }`.
- Six Vitest tests cover load, full readiness, partial readiness,
  empty input, duplicate kinds, and unknown-kind tolerance.
- No new domain entity, no new port, no migration, no UI. LEARN-043
  owns submission state; LEARN-044 owns the reviewer queue.

## Acceptance criteria

- The brief names all six required artefacts and the artefact kind
  each one maps to.
- The rubric has one criterion per artefact with a plain-language
  "what good looks like" line and a 0–2 point scale.
- `checkCapstoneReadiness` returns `ready: true` only when all six
  kinds are present among SUBMITTED artefacts.
- Unknown kinds in the input are ignored, never crash the check.
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- Submission persistence (LEARN-043).
- Reviewer UI or human grading (LEARN-044).
- Changing the artefact domain or the portfolio page.

## Dependencies

- LEARN-033 (STORY-135): the six artefact kinds already exist.

## Verification

- Six Vitest tests cover the loader and the readiness checker.
- Manual read: open `content/curriculum/capstone.json` and confirm
  a beginner can name the six deliverables without opening code.
