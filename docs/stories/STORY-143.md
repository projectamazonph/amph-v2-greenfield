# STORY-143: LEARN-043 — Capstone submission and readiness state

**Sprint:** Learning experience uplift, wave 4

**Points:** 3

**Epic:** Student experience (LEARN-043)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-043 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. The capstone brief
and rubric exist as data (LEARN-042), the artefact domain tracks
DRAFT vs SUBMITTED (LEARN-033), and the readiness checker maps
submitted kinds to required kinds. What is missing is the
submission itself: an auditable record that the learner declared
the capstone ready, a readiness state the learner can read, and a
pass gate the reviewer enforces (LEARN-044).

## Goal

Ship a `CapstoneSubmission` entity (DRAFT → SUBMITTED →
NEEDS_REVISION → PASSED), the `ICapstoneRepository` port with
Prisma + InMemory adapters, `SubmitCapstone` / `GetCapstoneStatus`
/ `ReturnCapstoneForRevision` / `PassCapstone` use cases on both
containers, server actions, and a `/capstone` status page showing
the brief, the readiness checklist, and the submission state.
Passing awards completion evidence (a certificate-eligible event),
never an employment claim.

## Scope

- Domain entity with four statuses and guarded transitions:
  DRAFT → SUBMITTED (owner), SUBMITTED → NEEDS_REVISION (reviewer
  note required), NEEDS_REVISION → SUBMITTED (owner re-submit),
  SUBMITTED → PASSED (reviewer, only when all six rubric criteria
  can be satisfied — enforced by requiring the six artefact ids at
  pass time).
- Prisma model `capstone_submissions` + migration with `deletedAt`,
  `createdById`, `updatedById`.
- Use cases + server actions + container wiring (both).
- `/capstone` page: brief summary, readiness checklist from
  `checkCapstoneReadiness` over the caller's SUBMITTED artefacts,
  submit button when ready, current submission state otherwise.
- `loading.tsx` with the AMPH skeleton.
- Domain branch coverage 100%. Use-case tests via
  `buildTestContainer()`.
- Passing the capstone emits a `course_complete`-style
  notification? No — a dedicated `capstone_passed` path is a
  follow-up; this story records the PASSED row and leaves delivery
  to LEARN-044.

## Acceptance criteria

- A learner with all six SUBMITTED artefacts sees "Ready to
  submit" and can submit; the row is auditable (actor + timestamp).
- A learner missing kinds sees exactly which deliverables are
  missing and cannot submit (the button is absent, the API rejects
  with `not_ready`).
- A submitted capstone can be returned for revision with a note
  and re-submitted.
- A capstone cannot be marked PASSED without six artefact ids.
- No UI copy implies employment, hiring, or job-readiness.
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- Reviewer scoring UI (LEARN-044).
- Rubric point entry (LEARN-044 reads the artefact ids recorded here).
- Certificate issuance on pass (existing `IssueCertificate` flow;
  wiring it to capstone pass is a later story).

## Dependencies

- LEARN-033 (STORY-135): artefact DRAFT/SUBMITTED lifecycle.
- LEARN-042 (STORY-142): brief, rubric, readiness checker.

## Verification

- Domain unit tests (100% branch), use-case tests, action tests.
- Manual smoke: submit six artefacts, open `/capstone`, submit,
  confirm the SUBMITTED row; return for revision; re-submit.
