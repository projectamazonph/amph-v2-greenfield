# STORY-039 — Campaign Builder Simulator

## Status


**Status:** ✅ Done (see PR commits listed in the broader story-status audit at docs/sprint-11/SESSION-SUMMARY-2026-07-21.md)
- [ ] Doc written (you are here)
- [ ] Tests written (Red)
- [ ] Production code written (Green)
- [ ] Refactored
- [ ] Committed, PR open

## Context

STORY-038 replaced the `str-triage` stub. STORY-039 does the same for `campaign-builder`.

**Campaign Builder** is a simulator where the user provides campaign requirements (budget, product category, targeting strategy) and the simulator generates a recommended Amazon PPC campaign structure (campaigns, ad groups, keyword lists, match types, and starting bids).

## What the Simulator Does

Given requirements, the simulator generates a campaign structure:

- Campaign name
- Ad groups with keyword lists
- Suggested match types (Exact / Phrase / Broad)
- Starting bids based on the category's typical CPC and competition level

**Scoring:** Structural completeness (did it include all required components?) × category appropriateness.

## Acceptance Criteria

1. `CampaignBuilderSimulator` implements `Simulator<CampaignBuilderInput, CampaignBuilderOutput>`
2. `CampaignBuilderInput` = `{ productCategory: string; monthlyBudget: number; targetingStrategy: "auto" | "manual" | "hybrid"; productNiche: string }`
3. `CampaignBuilderOutput` = `{ campaigns: CampaignStructure[], score: number }` — generates 1–3 campaigns depending on budget
4. Generates campaigns with ad groups, keywords (auto-generated from niche), match types, and suggested bids
5. `CampaignBuilderSimulator` replaces `StubSimulator` in `buildSimulatorRegistry()`
6. Unit tests covering all 3 targeting strategies and edge cases (zero budget, large budget)
7. Container wiring test verifies `registry.get("campaign-builder")` is not a `StubSimulator`

## Code Shape

```
src/
  domain/
    simulator/
      campaign-builder/
        CampaignBuilderInput.ts
        CampaignBuilderOutput.ts
        CampaignBuilderSimulator.ts

tests/
  unit/
    domain/
      simulator/
        campaign-builder/
          CampaignBuilderSimulator.test.ts
```

## Design Notes

- The keyword generator uses pattern matching on `productNiche` to produce relevant keyword stems (e.g., "running shoes" → ["running shoes men", "running shoes women", "best running shoes", ...])
- Starting bids are derived from `monthlyBudget / expected_clicks` with conservative assumptions
- The simulator is deliberately template-driven — real campaign building involves historical data that's not available here
