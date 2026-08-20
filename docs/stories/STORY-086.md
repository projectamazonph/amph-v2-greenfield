# STORY-086: Simulator grader — instructor calibration ranges

**Points:** TBD
**Epic:** Assessment Platform Maturity (Sprint 16+)

**Owner:** Ryan

## Status

**Status:** Planned — deferred from the 2026-08-20 audit follow-up umbrella
(`.audit-2026-08-20/UMBRELLA.md`, "Product & architecture gaps" item 1).
No code or story doc on `main` as of 2026-08-20.

## Why this is open

Every simulator grader currently uses fixed, severity-bucketed policies
shipped in the umbrella `seo/seeding/simulator-policies` directory. There
is no mechanism for an instructor to set "acceptable answer ranges" that
override or refine those defaults for a cohort, course, or scenario.

The competency-instructor UX already has an admin surface under
`/admin/instructors`, but no calibration workflow exists. A calibration
PR would need: a new port method (`SimulatorGradingPolicyRepository`),
an admin form per scenario, a domain rule that merges the instructor's
overrides into the simulator's `gradeAttempt` call, and a guardrail that
prevents an instructor from shipping a policy that would pass every
attempt (the "we'll mark everything fix" failure mode tracked in
STORY-083).

## Acceptance criteria

- An admin can attach a calibration range per dimension per scenario at
  `/admin/instructors/scenarios/[scenarioId]`.
- The calibration takes effect only for the cohort or course the
  instructor scopes; new attempts in that scope use the merged policy.
- The merged policy never lets a single dimension accept the full
  numeric band (calibration is a tighter bound, not a wider one).
- Every calibration write is recorded through `RecordAuditLog` with a
  new `AuditAction` value (extend the enum at
  `src/domain/values/AuditAction.ts`; no string literal).
- Tests cover the merge rule, the audit-log call, and the API gate.

## Verification

- `pnpm tsc --noEmit` clean.
- `pnpm lint` clean.
- `pnpm test` covers the merge rule, the audit-log call, and the
  route-level authorization.
- Manual: an instructor narrows the bid-elevator `bidAccuracy` band
  and a Practice-mode attempt at the boundary flip-flops the result.

## Out of scope

- Instructor certification or signed-off-per-attempt workflows.
- Per-student override. Calibration is per-cohort, not per-account.
- Replacing the umbrella-fixed policy. Calibration is additive.
