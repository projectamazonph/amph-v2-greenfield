# STORY-079: Rewrite Bid Elevator's economic model

## Status

**Decided.** Ryan's decisions recorded below (2026-07-29). See
`docs/simulator-remediation-decisions.md` for cross-cutting rules
(versioning, no magic constants, credential-mode gate) that apply here too.

**Scope note:** this decision set is much larger than the original
1-point estimate — it adds a full auction-response-curve model with
elasticities, a bidding-strategy/placement-adjustment system, and a
graduated tolerance-and-partial-credit grading scheme. Recommend splitting
before implementation; see "Suggested split" below.

## Current mechanism (verbatim, `BidElevatorSimulator.ts`)

```ts
const CTR = 0.02; // 2% CTR estimate, hardcoded for every keyword

const volumeShare = keyword.volume / totalVolume;
const allocatedBudget = budget * volumeShare;
const estimatedClicks = keyword.volume * CTR;
const suggestedBid = estimatedClicks > 0 ? allocatedBudget / estimatedClicks : 0;
groundTruthBids.set(keyword, Math.min(suggestedBid, keyword.currentBid * 2));
```

`estimatedRoas` is not derived from the bids at all — it's set to
`targetRoas` by construction (`BidElevatorSimulator.ts:80`).

## Decisions

### 1. Replace fixed 2% CTR

Scenario-authored baseline performance, not a match-type-only formula.
Match type is a small modifier on top of authored values, not the source
of truth:

```ts
matchTypeModifier = { exact: 1.05, phrase: 1.0, broad: 0.92 };
```

New required scenario fields: `baselineCtr`, `baselineCvr`,
`baselineImpressions`, `baselineBid`. These modifiers are simulator
assumptions, not universal Amazon facts, and must be versioned.

### 2. Max-bid formula

Target-ACoS-driven, not volume-share-driven:

```
Max sustainable CPC = averageOrderValue × expectedCvr × targetAcos
```

(equivalently `× expectedCvr ÷ targetRoas`, since `targetAcos = 1 /
targetRoas`). Worked example: AOV $29.99, CVR 12%, target ACoS 30% →
max CPC = $1.08.

Required new scenario fields: `averageOrderValue`, `targetAcos`,
`breakEvenAcos`, `baselineCvr`, `currentCpc`, `currentBid`, `clicks`,
`orders`, `spend`, `sales`. `breakEvenAcos` specifically enables feedback
that distinguishes "above target but still profitable" from "above
break-even, losing margin" from "below target, room to scale."

### 3. Remove the universal 2× bid cap

Replace with scenario-configured guardrails:

```ts
maxIncreasePct: number;   // e.g. 0.20
maxDecreasePct: number;   // e.g. 0.30
absoluteMaxBid?: number;
absoluteMinBid?: number;
```

Suggested defaults by situation (insufficient data → 0/±5%; stable
profitable → +10-20%; growth objective → +20-30%; moderately inefficient
→ -10-20%; materially above break-even → -20-40%; clearly irrelevant →
pause/major cut). Also model Amazon's dynamic bidding adjustments
separately from the entered base bid:

```ts
biddingStrategy: "fixed" | "down_only" | "up_and_down";
topOfSearchAdjustmentPct: number; // up to 100% per Amazon's dynamic bidding
restOfSearchAdjustmentPct: number; // up to 50%
productPageAdjustmentPct: number;
```

### 4. Estimated ROAS must respond to bids

Deterministic response curve, no randomness in v1:

```
bid → competitiveness → impressions → clicks → spend → orders → sales → ROAS
```

```ts
competitiveness = clamp(userBid / baselineBid, 0, maxCompetitiveness);
impressionMultiplier = Math.pow(competitiveness, impressionElasticity);
estimatedImpressions = baselineImpressions * impressionMultiplier;
estimatedCtr = baselineCtr * relevanceModifier * placementModifier;
estimatedClicks = estimatedImpressions * estimatedCtr;
estimatedCpc = Math.min(userBid, baselineCpc * Math.pow(competitiveness, cpcElasticity));
estimatedSpend = estimatedClicks * estimatedCpc;
estimatedCvr = baselineCvr * conversionModifier;
estimatedOrders = estimatedClicks * estimatedCvr;
estimatedSales = estimatedOrders * averageOrderValue;
estimatedRoas = estimatedSales / estimatedSpend;
```

Behavior invariant to test: raising bids should generally raise
competitiveness, impressions, and CPC, and may raise sales, but must
never _guarantee_ more orders.

### 5. Full scenario schema

```ts
type BidKeywordScenario = {
  keywordId: string;
  keyword: string;
  matchType: "exact" | "phrase" | "broad";
  intent: "branded" | "generic" | "competitor" | "category";
  strategicRole: "defense" | "research" | "performance";
  currentBid: number;
  baselineBid: number;
  currentCpc: number;
  baselineImpressions: number;
  baselineCtr: number;
  baselineCvr: number;
  clicks: number;
  orders: number;
  spend: number;
  sales: number;
  averageOrderValue: number;
  targetAcos: number;
  breakEvenAcos: number;
  impressionElasticity: number;
  cpcElasticity: number;
  relevanceModifier: number;
  conversionModifier: number;
  maxIncreasePct: number;
  maxDecreasePct: number;
  absoluteMinBid?: number;
  absoluteMaxBid?: number;
  minimumClicksForDecision: number;
  minimumOrdersForScaling: number;
  biddingStrategy: "fixed" | "down_only" | "up_and_down";
  placementAdjustmentPct?: number;
};

// Scenario-level:
currency: "USD" | "GBP" | "EUR" | "CAD";
evaluationDays: number;
campaignDailyBudget: number;
objective: "profitability" | "growth" | "ranking" | "defense";
```

### 6. Bid-accuracy tolerance

Not a flat ±20%. Combine absolute + percentage tolerance, scaled by
difficulty, plus partial credit:

```ts
tolerance = Math.max(absoluteTolerance, groundTruthBid * percentageTolerance);
```

| Difficulty   | Percentage | Absolute floor |
| ------------ | ---------- | -------------- |
| Beginner     | ±20%       | $0.10          |
| Intermediate | ±12%       | $0.07          |
| Advanced     | ±8%        | $0.05          |

Partial credit for: correct direction but outside range, correct hold
decision, correctly refusing to act on insufficient data. Volume must not
widen tolerance directly — data confidence does (via
`minimumClicksForDecision`).

## Decision-pack refinements (implementation-ready, 2026-07-29 second pass)

Acceptance criteria, stated as testable invariants:

- Changing a bid changes projected spend and may change projected ROAS.
- Two keywords with equal volume but different CVR or AOV receive different
  maximum sustainable CPC values.
- No code path sets `estimatedRoas` equal to `targetRoas`.
- The grader supports full, partial, and incorrect bid outcomes.
- Published scenarios persist `engineVersion` and `rubricVersion`.

Required tests (beyond per-formula unit tests):

- Higher bids increase competitiveness but do not guarantee higher ROAS.
- A zero/near-zero bid under-delivers and does not receive perfect budget
  adherence.
- A bid above break-even CPC is penalized even within a movement
  guardrail.
- Beginner/intermediate/advanced tolerances differ.
- Insufficient-data scenarios reward hold or `collect_more_data`-style
  decisions.
- **Deterministic replay:** the same scenario + engine version produces
  identical outputs, every time — this is a hard requirement, not just a
  nice-to-have, since the response curve introduces real arithmetic that
  must not drift.

## Suggested split

- **STORY-079a:** New scenario schema + response-curve engine (items 1, 4, 5) — the core economic model.
- **STORY-079b:** Guardrails + bidding-strategy adjustments (item 3).
- **STORY-079c:** Max-bid formula + break-even feedback (item 2).
- **STORY-079d:** Graduated tolerance + partial credit (item 6).

## Acceptance criteria

- [ ] Split confirmed (or explicitly kept as one story) before work starts
- [ ] `BidElevatorInput`/`KeywordBid`/scenario JSON carry every new field
      listed in the schema above
- [ ] Ground-truth max-bid formula matches the worked example above
      exactly
- [ ] `estimatedRoas` responds to bid changes per the response-curve model
- [ ] Guardrails replace the flat 2× cap
- [ ] Tolerance + partial credit implemented per the table above
- [ ] Domain tests cover the response curve, the max-bid formula, and each
      tolerance band, with full branch coverage
- [ ] Every new constant is scenario/policy-sourced, versioned, and
      documented (per `docs/simulator-remediation-decisions.md`)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
