# STORY-079: Rewrite Bid Elevator's economic model

## Status

**✅ Done — merged in PR #244.** This is Ryan's third and
authoritative decision pass (2026-07-29), delivered as explicit product
rules and acceptance criteria. It **supersedes** the two earlier passes
(merged in PRs #241/#242) wherever they conflict — notably the
elasticity model and the tolerance basis both changed. The earlier
passes remain in git history for context; this document is the one that
was implemented against.

See `docs/simulator-remediation-decisions.md` for cross-cutting rules
(versioning, no unversioned constants, credential-mode gate) that still
apply.

**Scope note:** still substantially larger than the original 1-point
estimate. See "Suggested split" below.

## Current mechanism (verbatim, `BidElevatorSimulator.ts`)

```ts
const CTR = 0.02; // 2% CTR estimate, hardcoded for every keyword
const suggestedBid = allocatedBudget / estimatedClicks; // volume-share allocation
groundTruthBids.set(keyword, Math.min(suggestedBid, keyword.currentBid * 2));
// estimatedRoas = targetRoas by construction — never actually computed
```

## Decisions (final)

### CTR and forecasting

Replace the fixed 2% CTR with a scenario-authored `baselineCtrPct` per
keyword. Match type, intent, category, and relevance may supply
**authoring-time fallback defaults** when a scenario is generated, but
they must never secretly determine ground truth at runtime — the
authored value is the sole reproducible source of truth.

Budget allocation uses **projected eligible traffic**, not raw
search-volume share:

```
bidRatio      = chosenBid / benchmarkCpc
impressionShare =
  maxImpressionSharePct × bidRatio^bidElasticity / (1 + bidRatio^bidElasticity)
estimatedCpc  = min(chosenBid, benchmarkCpc × (0.75 + 0.25 × min(bidRatio, 1.5)))
impressions   = availableImpressionsPerDay × simulationDays × impressionShare
clicks        = impressions × baselineCtr
spend         = clicks × estimatedCpc
orders        = clicks × baselineCvr
sales         = orders × revenuePerOrder
```

If total projected spend exceeds the budget, scale projected traffic:

```
budgetScale = availableBudget / unconstrainedSpend
```

This models campaign pacing rather than pretending budget is manually
assigned per keyword.

### Maximum bid: the economic CPC ceiling

```
targetAcos        = 1 / targetRoas
effectiveTargetAcos = min(targetAcos, breakEvenAcosPct)
maxEconomicCpc    = baselineCvr × revenuePerOrder × effectiveTargetAcos
```

Worked example: CVR 12%, revenue/order $30, target ROAS 4 (→ target ACoS
25%) → max CPC = 0.12 × 30 × 0.25 = **$0.90**.

This is the maximum _defensible_ CPC, not automatically the single
perfect bid — the recommended bid is the best candidate below that
ceiling that maximizes projected sales/contribution while holding the
target ROAS. If placement adjustments are added later:
`maxBaseBid = maxEconomicCpc / (1 + maximumPlacementAdjustment)` — do not
model placement multipliers until the simulator actually exposes them.

### Remove the 2× cap entirely

Not a valid economic rule: a bad current bid of $5.00 shouldn't authorize
$10.00, and a conservative current bid of $0.10 shouldn't block a
justified move to $0.50. Replace with three separate, distinct concepts:

- **Economic ceiling** — from CVR, order value, target ROAS, break-even
  ACoS (above).
- **Market ceiling** — informed by the keyword's `benchmarkCpc`.
- **Per-optimization change guardrail** — an optional 10-20% operational
  adjustment limit, which may vary by data confidence but must never
  _redefine_ the correct destination bid.

### Estimated ROAS must respond to the bids

```
keywordRoas  = estimatedSales / estimatedSpend
campaignRoas = sum(estimatedSales) / sum(estimatedSpend)
```

Must respond to the selected bids through estimated CPC, impression
share, clicks, spend, and sales. Must never echo `targetRoas`.

### Required fields

**Scenario-level:**

| Field                    | Unit                                 |
| ------------------------ | ------------------------------------ |
| `currencyCode`           | ISO currency code                    |
| `dailyBudget`            | currency/day                         |
| `simulationDays`         | days                                 |
| `targetRoas`             | ratio, e.g. 4.0                      |
| `breakEvenAcosPct`       | percent of sales                     |
| `defaultRevenuePerOrder` | currency/order                       |
| `minimumBidIncrement`    | currency/click                       |
| `maxBidChangePct`        | percent/optimization round, optional |

**Per keyword:**

| Field                        | Unit                              |
| ---------------------------- | --------------------------------- |
| `baselineCtrPct`             | percent                           |
| `baselineCvrPct`             | percent                           |
| `revenuePerOrder`            | currency/order, optional override |
| `benchmarkCpc`               | currency/click                    |
| `availableImpressionsPerDay` | impressions/day                   |
| `maxImpressionSharePct`      | percent                           |
| `bidElasticity`              | unitless                          |
| `evidenceClicks`             | clicks                            |
| `evidenceOrders`             | orders                            |
| `evidenceWindowDays`         | days                              |

### Bid tolerance: evidence-based, not difficulty-based

```
allowedDelta = max(5 × minimumBidIncrement, recommendedBid × confidenceTolerance)
```

| Confidence         | Basis                    | Tolerance |
| ------------------ | ------------------------ | --------- |
| High               | ≥30 clicks and ≥3 orders | ±10%      |
| Medium             | ≥15 clicks or ≥2 orders  | ±15%      |
| Low / modeled-only | below both               | ±20%      |

Search volume affects _opportunity_, not statistical confidence — it
must not widen tolerance on its own.

### Grading the outcome

- Full credit when projected ROAS meets target **and** the bid captures
  at least 90% of the best feasible projected sales.
- Partial credit for an economically safe but overly conservative bid.
- Score is capped when the bid exceeds the economic ceiling.

## Suggested split

- **STORY-079a:** Scenario schema + the projected-traffic forecasting
  engine (CTR/impression-share/CPC/budget-pacing formulas).
- **STORY-079b:** Max-bid ceiling (economic + market) + guardrail
  separation.
- **STORY-079c:** Evidence-based tolerance + outcome grading (full/
  partial/capped credit).

## Acceptance criteria

- [ ] `BidElevatorInput`/`KeywordBid`/scenario JSON carry every field in
      the schema above
- [ ] Ground-truth forecasting matches the formulas above exactly,
      verified against the worked $0.90 example
- [ ] Budget pacing (`budgetScale`) implemented — projected traffic scales
      down when unconstrained spend exceeds the daily budget
- [ ] The 2× cap is gone; economic ceiling, market ceiling, and the
      optional change guardrail are three separate, testable concepts
- [ ] `estimatedRoas`/`keywordRoas`/`campaignRoas` respond to bid changes;
      no code path echoes `targetRoas`
- [ ] Tolerance is evidence-based (`evidenceClicks`/`evidenceOrders`), not
      keyed to difficulty or volume
- [ ] Grading supports full/partial/capped credit per the rules above
- [ ] Deterministic-replay test: same scenario + engine version → identical
      output
- [ ] Domain tests cover each formula, each confidence tier, and the
      grading rule with full branch coverage
- [ ] Every constant is scenario/policy-sourced, versioned, documented
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
