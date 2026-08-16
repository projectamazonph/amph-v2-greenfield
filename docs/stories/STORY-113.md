# STORY-113: Reconcile public curriculum claims with the reviewed inventory

**Sprint:** Learning experience uplift, wave 0

**Points:** 5

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress. LEARN-003 is implemented on the dedicated branch.

## Goal

Make the public promise match the curriculum a beginner can actually open. Module
counts, lesson-time estimates, practice-tool availability, tier inclusion, and
certificate language must come from one reviewed product-claim config rather than
independent marketing constants.

## Scope

- Add `content/curriculum/public-claims.json` for reviewed labels, tier groupings,
  module summaries, simulator availability, and certificate wording.
- Derive landing curriculum, pricing, statistics, simulator roster, and certificate
  copy from that config.
- Add a contract test that joins the config to `inventory.json` and the real MDX
  frontmatter, failing when counts, minutes, module ownership, or simulator targets drift.
- Replace unsupported hiring-recognition wording with a completion-evidence claim;
  simulator work remains formative and public previews are labelled separately.

## Acceptance criteria

- Public module counts and planned minutes equal the checked-in source inventory.
- Tier cards use the reviewed course module counts, planned minutes, and tool set.
- Public simulator cards distinguish the public preview from enrolled practice.
- Certificate copy does not imply employment, hiring, or job-readiness guarantees.
- The claim contract test fails when source counts, minutes, tier mappings, or tool bridges change without a claim update.

## Verification

- Dependency-free config check matches all 31 MDX lessons and 361 planned minutes.
- Focused claim contract test and landing-page tests are required in CI.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are required in CI.
