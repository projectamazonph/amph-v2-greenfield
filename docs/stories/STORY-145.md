# STORY-145: LEARN-031 — Scenario packs (beginner, independent, messy-client)

**Sprint:** Learning experience uplift, wave 3

**Points:** 3

**Epic:** Student experience (LEARN-031)

**Owner:** Ryan

**Status:** Done.

## As-shipped notes

- Pack tier lives in the scenario id, name, and description
  (`-independent`, `-messy` suffixes). The `difficulty` column
  stays inside the domain enum (`beginner`/`intermediate`/
  `advanced`) because `ScorePolicy` weights key off it:
  independent packs seed as `intermediate`, messy-client packs as
  `advanced`. Unpacking that mapping into its own column is a
  follow-up if the PPC owner wants it.
- Bid-elevator default re-graded `intermediate` → `beginner`: it
  is the entry scenario behind the LEARN-014 first-decision route.
- Outcome explanations ship as author drafts in each scenario
  description; PPC-owner review of per-scenario outcome guidance
  is recorded as a follow-up (STORY-146).

## Context

This story opens LEARN-031 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. Each simulator ships
exactly one seeded scenario today, so every learner sees the same
single practice rep. The build plan calls for three distinct
instructional scenarios per tool — beginner (guided), independent
(unguided), messy-client (clean first) — plus one outcome
explanation reviewed by the PPC owner.

## Goal

Seed two additional scenarios per simulator (10 new rows, 15
total), one `independent` and one `messy-client` each, following
the existing seed-script pattern (`scripts/seed-simulator-
scenarios.ts`, idempotent upsert). Beginner coverage already
exists for campaign-builder, listing-audit, and keyword-research;
bid-elevator's default is re-graded beginner-appropriate and
str-triage gains an explicit beginner pack.

## Scope

- `scripts/seed-simulator-scenarios.ts`: 10 new entries.
  - bid-elevator independent (Prime Day electronics) + messy
    (home-office keyword list with duplicates and null bids,
    conforming to the keywords[] schema).
  - str-triage beginner (beauty, 10 rows, clear signals) + messy
    (pet supplements with duplicate search-term rows).
  - campaign-builder independent (premium coffee Sponsored
    Brands) + messy (fitness launch with optional fields left
    empty per schema).
  - listing-audit independent (water bottle) + messy (pet bed
    with sparse fields per schema defaults).
  - keyword-research independent (`vitamin-c-serum`) + messy
    (`wireless-earbuds-case`).
- All new rows seed as `status: "published", version: 1` through
  the existing `createSimulatorScenario` validation.
- `pnpm db:seed:scenarios` reports 15 rows; `pnpm validate:curriculum`
  still passes (no lesson changes).

## Acceptance criteria

- Each of the five simulators has at least three published
  scenarios with distinct difficulties covering beginner,
  independent, and messy-client.
- Every new scenario passes `createSimulatorScenario()` validation
  in the seed run (the script refuses to seed on any invalid row).
- The seed remains idempotent (re-run upserts, never duplicates).
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- PPC-owner review of outcome explanations (recorded as a
  follow-up; the scenario descriptions carry the author draft).
- UI for choosing scenarios (tools read the published row today;
  a picker is a later story).
- Changing any existing scenario's content or id.

## Dependencies

- LEARN-030 bridge registry (tool routes already resolve).

## Verification

- `pnpm db:seed:scenarios` output lists 15 rows across the five
  simulators (requires DATABASE_URL; verified in CI where the
  service container provides one).
- Focused seed-script dry validation passes locally without a DB
  (schema-level, via `createSimulatorScenario` unit path).
