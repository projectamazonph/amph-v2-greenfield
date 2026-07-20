# STORY-038 — STR Triage Simulator

## Status


**Status:** ✅ Done (see PR commits listed in the broader story-status audit at docs/sprint-11/SESSION-SUMMARY-2026-07-21.md)
- [ ] Doc written (you are here)
- [ ] Tests written (Red)
- [ ] Production code written (Green)
- [ ] Refactored
- [ ] Committed, PR open

## Context

STORY-037 replaced the `bid-elevator` stub with a real simulator. STORY-038 does the same for `str-triage`.

**STR Triage** (Search Term Report Triage) is a simulator where users categorize keyword-level PPC data into four buckets: **Keep**, **Pause**, **Add as Exact**, and **Add as Phrase**. It's a classification exercise based on ROAS and spend data.

## What the Simulator Does

Given a set of keyword performance rows (keyword, spend, revenue, orders, roas), the simulator categorizes each and provides a score.

**Classification rules:**

- `keep` — ROAS ≥ target ROAS and spend is within budget
- `pause` — ROAS < target ROAS and spend > budget × 0.8
- `add_as_exact` — ROAS ≥ target ROAS × 0.8 but spend is very low (low-hanging fruit — raise bids)
- `add_as_phrase` — ROAS is marginal (0.7–1.0× target) but volume is high

**Scoring:** 0–100 = percentage of keywords correctly categorized (simulated ground truth vs. user categories — for this story, the simulator provides ground truth only, user categorization is future scope).

## Acceptance Criteria

1. `StrTriageSimulator` implements `Simulator<StrTriageInput, StrTriageOutput>`
2. `StrTriageInput` = `{ rows: KeywordPerfRow[], targetRoas: number }` where `KeywordPerfRow = { keyword: string; spend: number; revenue: number; orders: number }`
3. `StrTriageOutput` = `{ classifications: KeywordClassification[], score: number }` — score is 0–100
4. Classification logic as described above
5. `StrTriageSimulator` replaces `StubSimulator` in `buildSimulatorRegistry()`
6. Unit tests covering all 4 classification paths
7. Container wiring test verifies `registry.get("str-triage")` is not a `StubSimulator`

## Code Shape

```
src/
  domain/
    simulator/
      str-triage/
        StrTriageInput.ts
        StrTriageOutput.ts
        StrTriageSimulator.ts

tests/
  unit/
    domain/
      simulator/
        str-triage/
          StrTriageSimulator.test.ts
```
