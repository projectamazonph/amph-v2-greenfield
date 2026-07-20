# STORY-040 — Listing Audit + Keyword Research Simulator

## Status


**Status:** ✅ Done (see PR commits listed in the broader story-status audit at docs/sprint-11/SESSION-SUMMARY-2026-07-21.md)
- [ ] Doc written (you are here)
- [ ] Tests written (Red)
- [ ] Production code written (Green)
- [ ] Refactored
- [ ] Committed, PR open

## Context

STORY-039 replaced the `campaign-builder` stub. STORY-040 replaces the last stub: `listing-audit`.

**Listing Audit** analyzes an Amazon product listing and identifies:

- Missing/improved backend keywords
- Title, bullet, and description recommendations
- Competitor keyword gaps

**Keyword Research** takes a product niche and generates a keyword list for indexing (backend keywords, headline keywords).

Both are combined into a single simulator: `listing-audit`.

## What the Simulator Does

Given a listing (title, bullets, description, category) and a product niche, the simulator:

1. Parses the listing for existing keywords
2. Identifies missing keyword categories
3. Generates a prioritized keyword list for indexing

## Acceptance Criteria

1. `ListingAuditSimulator` implements `Simulator<ListingAuditInput, ListingAuditOutput>`
2. `ListingAuditInput` = `{ title: string; bullets: string[]; description: string; category: string; niche: string }`
3. `ListingAuditOutput` = `{ audit: ListingAudit; keywordResearch: KeywordResearchResult; score: number }`
4. Listing audit covers: title completeness, bullet keywords, description coverage, backend keyword gaps
5. Keyword research generates 10–20 relevant keywords with search volume estimates (proxy)
6. `ListingAuditSimulator` replaces `StubSimulator` in `buildSimulatorRegistry()`
7. Unit tests covering all audit categories and keyword generation
8. Container wiring test verifies `registry.get("listing-audit")` is not a `StubSimulator`

## Code Shape

```
src/
  domain/
    simulator/
      listing-audit/
        ListingAuditInput.ts
        ListingAuditOutput.ts
        ListingAuditSimulator.ts

tests/
  unit/
    domain/
      simulator/
        listing-audit/
          ListingAuditSimulator.test.ts
```
