# STORY-089: Connected-Account Simulator (Amazon Advertising API mirror)

**Points:** 5
**Epic:** Future product (Sprint 16 follow-up)

**Owner:** Ryan

## Status

**Status:** Shipped. The sixth registry entry exists on `main`
behind this PR. The simulator mirrors a mock Amazon Advertising API
endpoint (no live Amazon account is ever touched); a published
`SimulatorScenario` row is seeded and is the only source of truth
for what the student sees, so there is nothing to forge and nothing
to leak. Scoring is formative-only, marked via the same
`FormativeScoreNotice` the other five simulators use.

## Why this shipped

A "Connected Account" simulator lets a student point at a mock Amazon
Advertising API endpoint and run simulated bid changes, search
term triage, and listing audits against it, the way the existing
five simulators run against seed scenarios. The original feature
brief (`docs/build-spec.md` references a sixth simulator row) was
gated by AGENTS.md Rule 5 ("no 6th simulator without a registry
entry"), which requires (a) a story, (b) a domain module, and (c) at
least one published `SimulatorScenario` row. This PR ships all three.

The simulator is intentionally side-effect-free: no attempt
lifecycle, no persistence, no XP award. There is nothing to persist
because the only state the simulator needs is the published
scenario, which already lives on the `SimulatorScenario` row, and
the student's response is graded immediately. The result view
mounts `FormativeScoreNotice` so the score is unambiguously
formative and never used as a certification, hiring, or
job-readiness signal (STORY-078).

## Acceptance criteria

- A new `SimulatorId` and a registered domain module
  (`src/domain/simulator/connected-account/`) following the same
  shape as the existing five. ✓
- An admin scenario editor under `/admin/simulators/connected-account`
  (the generic `/admin/simulators` routes already drive by
  simulatorId; nothing new to build). ✓
- A published `SimulatorScenario` row reachable by
  `SimulatorRegistry` and gated by the `/api/health/ready` probe. ✓
  The probe loops `container.simulatorRegistry.list()` and fails
  with `status: "missing_scenarios"` if any registered simulator
  lacks a published row; adding `connected-account-scenario-default`
  to `scripts/seed-simulator-scenarios.ts` clears the gate.
- The readiness probe and the e2e spec from PR #399 (runbook
  `docs/runbooks/simulator-scenario-missing.md`) continue to pass. ✓
- A scoring policy `gradeAttempt()` that maps the mock API responses
  onto the existing rubric dimensions. Formative label only. ✓
  `ConnectedAccountSimulator.gradeAttempt()` (`ConnectedAccountSimulator.ts`)
  produces two dimensions: `bidAccuracy` (share of keywords landing
  in the ±5% optimal band) and `triageAccuracy` (share of search-term
  rows where the user's action matches ground truth).
- No external API dependency on a live Amazon account. ✓
  The scenario is the only source of truth; the simulator is a pure
  function over the input scenario + the student's decisions.

## Verification

- `pnpm validate:simulator-registry` lists 6 simulators and exits 0.
- `pnpm tsc --noEmit` clean.
- `pnpm lint` 0 errors, 0 new warnings (4 pre-existing Next `<a>`
  warnings in unrelated files).
- `pnpm test:arch` 916/916 (4 new tests added: connected-account
  simulator + tools/index page count + validator suite + simulator copy).
- All STORY-089-specific unit tests pass (12 simulator + 1 module
  index + 6 validator = 19 cases across the new files).
- Manual: an enrolled student opens `/tools/connected-account`,
  sees the mock campaign snapshot, adjusts bids and triages the
  STR, submits, sees a formative score with per-row feedback.

## Out of scope

- Real Amazon Advertising API credentials. The simulator always reads
  from the mock endpoint bundled with the project.
- Multi-account switching. Single mock account per student.
- Persistence of API tokens. The simulator is intentionally
  side-effect-free.
- Challenge-mode XP bonus. Same as above — the tool grades and
  returns; there is no attempt record to attach XP to.
- Per-simulator attempt lifecycle (Start → SaveDecision → Submit →
  Grade → ComposeFeedback). The other 5 simulators carry this for
  reasons specific to their grading flows (XP, debrief, etc.);
  Connected-Account has none of those, so the slice stays minimal.
