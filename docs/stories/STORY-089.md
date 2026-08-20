# STORY-089: Connected-Account Simulator (Amazon Advertising API mirror)

**Points:** TBD
**Epic:** Future product (no Sprint 16 ticket)

**Owner:** Ryan

## Status

**Status:** Planned — deferred from the 2026-08-20 audit follow-up umbrella
(`.audit-2026-08-20/UMBRELLA.md`, "Product & architecture gaps" item 4).
Mentioned in the original feature brief but no story doc, no registry
entry, and no code on `main` as of 2026-08-20.

## Why this is open

A "Connected Account" simulator would let a student point at a mock
Amazon Advertising API endpoint and run simulated bid changes, search
term triage, and listing audits against it, the way the existing five
simulators run against seed scenarios. The feature brief
(`docs/build-spec.md` references a sixth simulator row) never landed
because every addition is gated by AGENTS.md Rule 5 ("no 6th simulator
without a registry entry") and the registry entry requires a story, a
domain module, and at least one published `SimulatorScenario` row.

This is the largest of the still-open audit items. Triage decision:
defer to a dedicated sprint once the simulator accuracy remediation
plan (`docs/simulator-remediation-decisions.md`) is closed. Until then,
no `feat(simulators):` work should introduce a sixth `SimulatorId`.

## Acceptance criteria

- A new `SimulatorId` and a registered domain module
  (`src/domain/simulators/connected-account/`) following the same
  shape as the existing five.
- An admin scenario editor under `/admin/simulators/connected-account`.
- A published `SimulatorScenario` row reachable by
  `SimulatorRegistry` and gated by the `/api/health/ready` probe.
- The readiness probe and the e2e spec from PR #399 (runbook
  `docs/runbooks/simulator-scenario-missing.md`) continue to pass.
- A scoring policy `gradeAttempt()` that maps the mock API responses
  onto the existing rubric dimensions. Formative label only.
- No external API dependency on a live Amazon account.

## Verification

- `pnpm validate:simulator-registry` (or equivalent new script) lists
  six simulators and proves the new one's scenario exists.
- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` all
  green.
- Manual: an enrolled student opens
  `/tools/connected-account`, runs a scenario, sees formative score.

## Out of scope

- Real Amazon Advertising API credentials. The simulator always reads
  from the mock endpoint bundled with the project.
- Multi-account switching. Single mock account per student.
- Persistence of API tokens. The simulator is intentionally
  side-effect-free.
