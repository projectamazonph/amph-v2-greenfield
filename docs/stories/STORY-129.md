# STORY-129: LEARN-001 — Machine-readable curriculum and offer inventory

**Sprint:** Learning experience uplift, wave 0

**Points:** 1

**Epic:** Student experience (LEARN-001)

**Owner:** Ryan

**Status:** Done.

## Context

This story closes LEARN-001 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. The implementation is the
machine-readable inventory contract that joins every MDX lesson to its
course, tier, tool bridge, resource, and final deliverable.

The original delivery was STORY-111 (Curriculum inventory release gate),
merged in PR #383 on 2026-08-16. That story recorded the 31-lesson
baseline. The contract has since grown to 42 lessons across the three
courses, all covered by the same domain module and validation script.

## Goal

Give the course team one checked-in contract for what a beginner can
actually study, and give the platform one source of truth that landing
pages, catalogue pages, simulator handoffs, and public claims can read
without re-deriving numbers from MDX files.

The inventory lists, for every published lesson:

- slug and title
- course and tier mapping
- module and lesson number
- planned minutes (from MDX frontmatter)
- XP reward (from MDX frontmatter)
- tool bridge declaration and target (when kind is "simulator")
- resource references
- final deliverable description (or `null`)

## Acceptance criteria

- [x] Every published MDX lesson appears exactly once in the inventory.
- [x] Every lesson carries a course slug, tier, planned minutes, XP
      reward, tool bridge, resource references, and final deliverable
      (or `null`).
- [x] Simulator bridges name their target.
- [x] Duplicate slugs, missing tier mappings, missing minutes, and
      missing tool targets fail the release check.
- [x] The inventory is the single reviewed contract; the import script
      and the catalogue read model both consume it.
- [x] `pnpm validate:curriculum` is green and runs in CI.

## Files

- `content/curriculum/inventory.json` — checked-in learning contract
- `src/domain/curriculum/CurriculumInventory.ts` — manifest parser,
  source-to-contract join, summary
- `scripts/validate-curriculum-inventory.ts` — release check
- `src/domain/curriculum/__tests__/CurriculumInventory.test.ts` —
  domain tests for enrichment and every documented failure mode

## Verification

- `pnpm validate:curriculum` reports 42 lessons, 443 planned minutes.
- Domain tests pass for enrichment, duplicate source slugs, missing
  minutes, missing tier mappings, missing simulator targets, and orphan
  manifest rows.
- The original PR #383 CI was green; the contract has been extended
  without breaking the public claim or inventory validation.

## Dependencies

- LEARN-002 (planned minutes are now durable, sourced from frontmatter).
- LEARN-003 (public claims join back to this inventory).
- LEARN-005 (the learning release gate runs `pnpm validate:curriculum`).
