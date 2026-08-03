# STORY-085 — Scenario publishing + versioning

**Sprint:** 16 (Assessment Platform Maturity)
**Status:** ◐ done — narrower scope than the original one-line backlog title; see "Scope note" below.

## Context

`SimulatorAttempt.scenarioVersion` has existed since STORY-064 (`prisma/schema.prisma`,
`Int @default(1)`), but nothing ever set it to anything other than the literal `1`:
`StartSimulatorAttempt.ts` hardcoded `scenarioVersion: 1` on every attempt, regardless
of how many times an admin had edited the scenario since. The column existed but
carried no real signal — a dead stub, the same pattern as `IEmailTemplateRepository`
and `IProgressEventRepository` before the 2026-08-02 session wired those in (see
`CLAUDE.md` "Known gaps").

`docs/simulator-remediation-decisions.md` (Ryan's decision set for Sprint 15,
2026-07-29) already establishes the principle this story formalizes generically:
"A dataset, rubric, or engine update must never silently change the expected answer
for an attempt already graded... Scenario versions are immutable after publication."

## What this story does

1. `SimulatorScenario` (`src/domain/entities/SimulatorScenario.ts`) gains a real
   `version: number` field. `createSimulatorScenario()` accepts an optional `version`
   param (default `1`).
2. `UpdateSimulatorScenario` now reads the scenario's currently-persisted `version`
   before rebuilding it, and passes `version: current + 1` into the factory — every
   edit is a new version, not a silent in-place mutation under the same version
   number.
3. `StartSimulatorAttempt` now records `scenarioVersion: scenarioResult.value.version`
   (the scenario's real, current version) instead of the hardcoded literal `1`. This
   is the concrete bug fix: a `SimulatorAttempt` now honestly records which version
   of the scenario the student was looking at when they started.
4. Prisma: `simulator_scenarios.version Int @default(1)` (migration
   `20260803210000_simulator_scenario_version`), wired through
   `PrismaSimulatorScenarioRepository`'s `create()`/`update()`/`mapRow()`.
   `InMemorySimulatorScenarioRepository` needed no changes — it stores whatever
   `SimulatorScenario` object it's given, so `version` flows through for free.

## Scope note — what this story does NOT do

The original backlog title was "Scenario publishing + versioning." This pass ships
the **versioning** half only. It deliberately does not build:

- **A draft/published lifecycle.** Every scenario is implicitly "published" the
  moment it's created or edited — there is no staging area where an admin can draft
  changes invisible to students before flipping them live. Building that requires
  new admin UI (a publish action, a draft-vs-published toggle on the scenario list
  and edit forms), a filter change in `listAll`/`findById` for the student-facing
  path vs. the admin path, and a decision about what an in-progress attempt should
  see if its scenario is unpublished mid-attempt. That's its own ~150-line change,
  not a one-line addition to this one — a natural STORY-085b, per this repo's own
  "When a Story Splits" rule (`docs/sprint-plan.md`).
- **Historical content retrieval by version.** `SimulatorAttempt.scenarioVersion` now
  records a real number, but there is no `findVersion(scenarioId, version)` method to
  fetch the exact historical content of an older version — `update()` still mutates
  the current row in place (just bumping the version counter alongside), it does not
  snapshot the pre-edit content into a separate history table. Concretely: if an
  admin edits a scenario mid-attempt, the recorded `scenarioVersion` on that attempt
  will now (correctly) diverge from the _live_ scenario's current version, which is
  a real, usable signal (e.g., a future admin/audit view could flag "this attempt's
  recorded version doesn't match the scenario's current version" as a drift
  warning) — but nothing yet lets you rehydrate exactly what the old content
  said. Full point-in-time snapshotting is a bigger, separate change and wasn't
  built speculatively.
- **Grading integrity.** `GradeSimulatorAttempt` was inspected as part of scoping this
  story: it does not read scenario content at all — it grades purely from
  client-submitted `scoreDimensions` against a `ScorePolicy` looked up by
  `(simulatorId, difficulty, mode)`. Per-decision correctness grading against
  scenario ground truth (where it exists) happens in each simulator's own domain
  module, invoked from the relevant `src/app/tools/<simulator>/actions.ts`. This
  story does not touch that path — the "immutable after publication" guarantee for
  Sprint 15's rewritten simulators (STORY-079–084) is Ryan's decision, tracked
  separately in `docs/simulator-remediation-decisions.md`, and out of scope here.

## Verification

- `pnpm typecheck && pnpm lint` both clean.
- `pnpm test`: 3528 passed / 2 skipped (up from 3524/2), including new coverage:
  - `tests/unit/domain/entities/SimulatorScenario.test.ts` — factory defaults
    `version` to 1 and accepts an explicit value.
  - `src/usecases/__tests__/UpdateSimulatorScenario.test.ts` — version bumps by 1 on
    each successive update (1 → 2 → 3), never resets.
  - `src/infra/simulator/__tests__/PrismaSimulatorScenarioRepository.test.ts` —
    version round-trips through `create`/`update`/`findById`.
  - `tests/unit/usecases/StartSimulatorAttempt.test.ts` — a started attempt records
    the scenario's real (non-1) version when the scenario has been edited.
- **Not verified against a live Postgres instance**: no `DATABASE_URL`-reachable
  Postgres or Docker daemon was available in this session's sandbox (`pg_isready`
  and `docker ps` both failed to connect). The migration is a single
  `ALTER TABLE ... ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1` statement — the
  lowest-risk migration shape available (no `CONCURRENTLY`, no backfill, no index),
  but this is stated rather than silently assumed. Verify with `pnpm prisma:migrate`
  against a real database before/at deploy if that matters for this change.
