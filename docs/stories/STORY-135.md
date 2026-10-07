# STORY-135: LEARN-033 — Learner artefact domain

**Sprint:** Learning experience uplift, wave 3

**Points:** 3

**Epic:** Student experience (LEARN-033)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-033 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. Artefacts are the
structured learner outputs a beginner accumulates: a decision log
entry, a listing audit, a keyword plan, a campaign map, a triage
report, and a weekly client readout. They belong to the learner,
stay private by default, and are exportable. LEARN-034 (save from
tool debriefs) and LEARN-035 (portfolio page) are blocked on this
domain existing.

## Goal

Ship a `LearnerArtefact` entity with six typed kinds, a versioned
but immutable-when-submitted lifecycle, the `IArtefactRepository`
port, Prisma + InMemory adapters, `SaveArtefact` and
`ListStudentArtefacts` use cases on the DI container, and server
actions. Access control: a student reads only their own artefacts;
an admin can read any artefact for capstone review (LEARN-044).

## Scope

- Domain entity `LearnerArtefact` with kinds: `decision-log`,
  `listing-audit`, `keyword-plan`, `campaign-map`, `triage-report`,
  `weekly-readout`. Payload is a JSON-safe record validated per kind
  (non-empty title, scenario reference, rationale, created date).
- `IArtefactRepository` port: `create`, `findById`, `listByUser`,
  `listLatestByUserAndKind`, `update` (title/payload only, rejected
  once submitted).
- Prisma model `learner_artefacts` + migration with `deletedAt`,
  `createdById`, `updatedById`.
- `PrismaArtefactRepository` + `InMemoryArtefactRepository`.
- Use cases: `SaveArtefact` (create or revise draft), `SubmitArtefact`
  (lock for review), `ListStudentArtefacts` (owner-scoped).
- Server actions: `saveArtefactAction`, `submitArtefactAction`,
  `listArtefactsAction`.
- Wire `artefactRepo`, `saveArtefact`, `submitArtefact`,
  `listStudentArtefacts` into `buildContainer()` and
  `buildTestContainer()`.
- Export support: artefact rows included in `ExportUserData`
  (LEARN-060 contract).

## Acceptance criteria

- A student creates a draft artefact with title, kind, scenario ref,
  and rationale.
- A student revises a draft and submits it; submitted artefacts
  reject further edits.
- A student lists only their own artefacts; another student's rows
  never leak.
- An admin lists a student's submitted artefacts for capstone review.
- Artefacts appear in the student's account-data export.
- Domain branch coverage 100% (pure functions).
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- The portfolio UI (LEARN-035, separate story).
- Tool-debrief autosave wiring (LEARN-034, separate story).
- Admin mutation audit events beyond what `RecordAuditLog` already
  covers for existing use cases (reviewer actions are LEARN-044).

## Dependencies

- LEARN-001 inventory (tier/ownership context).
- LEARN-060 events include `artefact_saved` (defined here, consumed there).

## Verification

- Domain unit tests (100% branch), use-case tests via
  `buildTestContainer()`, Prisma adapter integration test,
  server-action tests.
- Manual smoke: sign in, create a draft decision-log artefact via
  the action, revise it, submit it, confirm a second student cannot
  read it.
