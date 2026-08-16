# STORY-109: Curriculum coverage gaps — simulation-prep for Modules 1, 3, and 5

**Sprint:** Curriculum tone remediation

**Points:** 8

**Epic:** Student experience

**Owner:** Ryan

**Status:** Planned. Phase 5 of the `2026-08-16` order and voice plan.

## Goal

Close the pattern gap where Modules 1, 3, and 5 lack a simulation-prep lesson even though 0.2 promises tools that unlock at those modules.

## Source

`docs/audits/2026-08-16-curriculum-order-and-voice-plan.md`, Section 7.

## Scope

- Add `1.6-metrics-practice.mdx` in `content/curriculum/modules/1-foundations/`. A 5-minute simulation-prep that uses the Profitability and Max-CPC sheet built across 1.1-1.5. The learner is given three short product scenarios and asked to compute max CPC, break-even ACoS, and minimum ROAS for each.
- Either add `3.4-listing-audit-prep.mdx` in `content/curriculum/modules/3-listing-optimization/` if the Listing Audit tool is in scope, or remove the Listing Audit row from `0.2-platform-tour.mdx` line 55 if the tool is not built. Confirm with the current sprint plan before deciding.
- Either add `5.4-portfolio-practice.mdx` in `content/curriculum/modules/5-portfolio-strategy/` if a portfolio-level tool is planned, or restructure `6.3-bid-elevator-prep.mdx` to cover portfolio-level decisions too. Confirm with the current sprint plan before deciding.

## Acceptance checks

- Each new lesson passes the voice template from STORY-107.
- The 0.2 platform tour still matches the actual module lineup.
- Each new lesson has a corresponding test in `content/curriculum/modules/<module>/__tests__/`.
- pnpm tsc, pnpm lint, pnpm test pass.

## Verification

- Read 0.2 and confirm every row in the module-lineup table and the tools table matches a real lesson or tool.
- Confirm the three new files (or the 6.3 restructure) match the pattern of the existing simulation-prep lessons in 4.4, 6.3, and 7.3.
