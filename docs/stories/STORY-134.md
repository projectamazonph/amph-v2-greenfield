# STORY-134: LEARN-030 — Lesson-to-tool bridge registry

**Sprint:** Learning experience uplift, wave 3

**Points:** 2

**Epic:** Student experience (LEARN-030)

**Owner:** Ryan

**Status:** Planned.

## Context

This story opens LEARN-030 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. The current curriculum
inventory already records a `toolBridge` per lesson (`content/curriculum/inventory.json`),
the simulator registry already knows the registered simulators
(`buildSimulatorRegistry`), and the public-claim config already records
which tiers unlock which simulators (`content/curriculum/public-claims.json`).
What is missing is a single typed bridge registry that joins those
three sources and fails the release check when a lesson points at a
broken tool route, a tier that does not unlock the tool, or an
unpublished scenario.

## Goal

Add a pure validator that joins the lesson toolBridge rows from the
inventory with the registered simulator ids, the tier-simulator
allowlist, and the set of published simulator scenarios. Wire the
validator into `pnpm validate:learning-release` so a broken tool
route, a tier mismatch, or an unpublished scenario fails the
release check before the production promotion.

## Scope

- Add `src/lib/toolBridge.ts` with the pure `validateToolBridges`
  function. The function reads:
  - the parsed curriculum inventory (from LEARN-001),
  - the registered simulator ids,
  - the public-claim tier-simulator allowlist, and
  - the set of published simulator scenario keys,
    and returns every structural failure in one pass.
- Add `scripts/validate-tool-bridges.ts` that wires the validator to
  the existing filesystem readers and exits non-zero on any failure.
- Add a `validate:tool-bridges` npm script and chain it inside
  `validate:learning-release`.
- Add Vitest coverage for the pure validator (no scenario published,
  missing simulator id, tier mismatch, duplicate bridge target,
  orphan target).

## Acceptance criteria

- [ ] `pnpm validate:learning-release` exits non-zero when a lesson's
      `toolBridge.target` is not in the registered simulator list.
- [ ] `pnpm validate:learning-release` exits non-zero when a bridge
      target is published but no tier in the public-claim config
      includes it.
- [ ] `pnpm validate:learning-release` exits non-zero when a bridge
      target is published but no `published` SimulatorScenario row
      exists.
- [ ] Five Vitest tests cover the validator's happy path and each
      failure mode.
- [ ] `pnpm validate:curriculum` still passes; the new validator
      extends the existing release check, it does not replace it.

## Non-goals

- A persistence model. The validator is read-only and joins the
  existing sources; no new tables or rows are required.
- Authoring additional scenario tiers. LEARN-031 owns the
  beginner/independent/messy-client scenario packs.
- Replacing the per-tier simulator target list in
  `public-claims.json`. The validator reads that config; it does
  not write to it.

## Dependencies

- LEARN-001 (STORY-111, STORY-129): the inventory is the source of
  truth for lesson toolBridge rows.
- LEARN-003 (STORY-113): the public-claim config is the source of
  truth for tier-simulator allowlists.

## Verification

- Manual smoke: temporarily edit
  `content/curriculum/inventory.json` to point a bridge at an
  unregistered simulator, run `pnpm validate:learning-release`, and
  confirm the script exits non-zero with the expected failure
  message.
- Five Vitest tests cover the validator.
