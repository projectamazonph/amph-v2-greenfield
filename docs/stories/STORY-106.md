# STORY-106: Curriculum order consolidation — dedup match types, negative keywords, and Brand Analytics

**Sprint:** Curriculum tone remediation

**Points:** 8

**Epic:** Student experience

**Owner:** Ryan

**Status:** Planned. Phase 2 of the `2026-08-16` order and voice plan.

## Goal

Eliminate the three concepts that the curriculum currently teaches more than once, and resolve the forward-reference gaps that put acronym labels in front of their definitions.

## Source

`docs/audits/2026-08-16-curriculum-order-and-voice-plan.md`, Section 4.

## Scope

- Brand Analytics location: replace the Source 2 paragraph in `2.2-keyword-research-workflow.mdx` (lines 73-93) with a single forward reference to Module 8. Replace the Brand Analytics row in the `3.3-aplus-content.mdx` Brand Registry feature table (lines 29-37) with the same forward reference. Module 8.1 keeps the full Brand Analytics treatment.
- Match-type dedup: replace the duplicate match-type section in `4.1-sponsored-products.mdx` with a one-line cross-reference to `2.1-match-types.mdx`. Trim 4.1 from 179 lines to about 120 lines. Spend the saved space on the campaign-organization content 4.1 is meant to teach.
- Negative-keyword dedup: move the unique content from `7.2-negative-keywords.mdx` (Measuring Impact, Amazon search suggestions, competitor brand terms, cross-campaign negative pattern) into `2.3-negative-keywords.mdx` as a "Beyond the search term report" section. Reduce 7.2 to a 5-minute recap that links back to 2.3.
- 0.2 Big Six reference: in `0.2-platform-tour.mdx` line 39, replace the module-lineup table row for Module 1 with "Six metrics you'll learn to read together: the Big Six." Drop the acronym list from 0.2.
- Bid-strategy forward reference: in `5.2-budget-pacing.mdx`, after the burn-rate section, add a single sentence: "How fast a campaign burns depends on its bid strategy. Module 6 covers that."

## Acceptance checks

- Brand Analytics is taught in exactly one lesson (8.1) and referenced in exactly two forward references (2.2 and 3.3).
- Match types are taught in exactly one lesson (2.1) and referenced in exactly one forward reference (4.1).
- Negative keywords are taught in exactly one lesson (2.3) and reinforced in 7.2 as a recap.
- Lesson 0.2 does not contain acronym labels (CPC, CTR, ACoS, TACoS, ROAS, CVR) for the Big Six.
- No new concept is named in a lesson before it is defined.
- 4.1, 2.3, and 7.2 retain all worked examples and decision tables from the prior versions.
- pnpm tsc, pnpm lint, pnpm test pass.

## Verification

- Grep the curriculum for "broad match," "phrase match," "exact match," "negative keyword," "Brand Analytics" and confirm each appears as a primary section in only one lesson.
- Read 2.1 → 4.1 in sequence and confirm 4.1 reads as a continuation of 2.1, not a duplicate.
- Read 2.3 → 7.2 in sequence and confirm 7.2 reads as a recap of 2.3 with practice, not a reteach.
- Inspect 0.2 line 39 and confirm the acronyms no longer appear.
