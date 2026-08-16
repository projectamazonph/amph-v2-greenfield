# STORY-111: Curriculum inventory release gate

**Sprint:** Learning experience uplift, wave 0

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** Done. Merged in PR #383 (`bc97101`) on 2026-08-16.

## Goal

Give the course team one checked-in contract for what a beginner can actually study. The contract joins MDX frontmatter with the course tier, tool bridge, supporting resource references, and final deliverable for every published lesson.

## Scope

- `content/curriculum/inventory.json` records the reviewed learning contract for all 31 published lessons.
- `src/domain/curriculum/CurriculumInventory.ts` parses the contract and joins it to the source lessons without importing filesystem or framework code into the domain layer.
- `scripts/validate-curriculum-inventory.ts` runs the release check against the real MDX tree.
- `pnpm validate:curriculum` is the repeatable command for content authors and CI.

## Acceptance criteria

- Every published MDX lesson appears exactly once in the inventory.
- Every lesson has a course tier mapping, planned minutes greater than zero, a tool bridge declaration, resource references, and an explicit final deliverable or `null`.
- Simulator bridges must name their target.
- Duplicate slugs, missing lessons, orphan manifest rows, missing minutes, and missing tier mappings fail the validator with actionable errors.
- Inventory rows preserve source ordering by module and lesson number.

## Verification

- A dependency-free source and manifest check passes for all 31 lessons and 31 inventory rows.
- Unit tests cover enrichment, duplicate source slugs, missing minutes, missing tier mappings, missing simulator targets, and orphan manifest rows.
- `pnpm validate:curriculum` and the focused Vitest file passed in PR #383 CI.
