# STORY-089: Connected-Account Simulator (Amazon Advertising API mirror)

**Points:** TBD
**Epic:** Future product (no Sprint 16 ticket)

**Owner:** Ryan

## Status

**Status:** Deferred (no code, awaiting external decision). Re-verified
2026-10-08 against `main` at `6c45b96e`. No `ConnectedAccountSimulator`
domain module exists under `src/domain/simulators/`. No entry in
`src/infra/simulator/buildSimulatorRegistry.ts` (the registry still
holds exactly five simulators: Bid Elevator, Search Term Triage,
Campaign Builder, Listing Audit, Keyword Research). The tools page
renders the same five AMPH cards plus the live `/tools/ad-console`
iframe that points at the student's real Amazon Advertising account.
No `/admin/simulators/connected-account` route. No published
`SimulatorScenario` row keyed off a `connected-account` `SimulatorId`.

The 2026-08-20 audit follow-up umbrella
(`.audit-2026-08-20/UMBRELLA.md`, "Product & architecture gaps" item 4)
continues to list STORY-089 as the largest still-open product gap.

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
plan (`docs/simulator-remediation-decisions.md`, referenced from
STORY-079 / STORY-083 / the Listing Audit domain module; confirm the
file exists on disk before quoting it) is closed. Until then, no
`feat(simulators):` work should introduce a sixth `SimulatorId`.

## What blocks un-deferral

A real product decision is required before this can be picked up by an
agent:

- **Demo credential ownership.** Does AMPH partner with Amazon
  Advertising for a sandbox app registration, or does the simulator
  stand entirely behind a fabricated endpoint? The former requires
  credentials that no agent can provision; the latter needs explicit
  product sign-off so the academy is not promising a student experience
  that diverges from the real API.
- **Auth shape.** PR #494 hand-rolled Google OAuth2 + PKCE for
  student sign-in. Reusing that infra for an Amazon Advertising
  connection is plausible but unconfirmed; a third-party OAuth flow
  against the Amazon Advertising API has different scope semantics
  (`ads:read`, `ads:write`) that the existing `ConnectedAccount` profile
  surface does not model.
- **Scope envelope.** The acceptance criteria below already rule out
  "real API calls" and "multi-account switching", which means the
  artifact is a fifth-and-a-half-tier experience (a mock endpoint
  that exists only to teach the *shape* of a connected account). The
  cost-benefit case against the five existing simulators has not been
  made.

Until those three questions get a written answer from the owner,
this story remains Deferred. The kanban task will block on
`kind='capability'` rather than build a mock and present it as done,
per the kanban rule in the parent card.

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
