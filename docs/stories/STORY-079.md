# STORY-079: Rewrite Bid Elevator's economic model

## Status

**Blocked — needs Ryan's PPC input.** Per `docs/sprint-plan.md` Sprint 15 and
`docs/audit-2026-07-26-simulator-accuracy-review.md` Phase 2, this story
requires real Amazon PPC bidding expertise. An agent must not invent the
ground-truth formula. This document scopes the current defect precisely and
lists the specific decisions needed before any code changes.

## Current mechanism (verbatim, `BidElevatorSimulator.ts`)

```ts
const CTR = 0.02; // 2% CTR estimate, hardcoded for every keyword

const volumeShare = keyword.volume / totalVolume;
const allocatedBudget = budget * volumeShare;
const estimatedClicks = keyword.volume * CTR;
const suggestedBid = estimatedClicks > 0 ? allocatedBudget / estimatedClicks : 0;
// Cap at 2× current bid to stay conservative
groundTruthBids.set(keyword, Math.min(suggestedBid, keyword.currentBid * 2));
```

`estimatedRoas` in the output is **not derived from the bids at all** —
`BidElevatorSimulator.ts:80` sets `estimatedRoas = targetRoas` by construction,
so the "ground truth ROAS" is tautological: whatever target the scenario
states, the ground truth claims to hit it exactly, regardless of the actual
bid math above it.

Grading tolerance: `isBidAccurate()` accepts any user bid within ±20% of
ground truth, flat, for every keyword regardless of volume or bid size.

## Why this is wrong

- CTR is not a function of anything in the input (match type, keyword
  intent, historical performance). Every keyword in every scenario gets
  the identical 2%.
- Budget is allocated purely by volume share, with no conversion rate,
  revenue-per-conversion, or margin anywhere in the model. Two keywords
  with identical volume get identical suggested bids even if one converts
  at 10× the rate of the other.
- The "cap at 2× current bid" rule has no stated rationale in code or
  docs — it may be an arbitrary safety valve, not a PPC principle.
- `estimatedRoas` doesn't move when bids change, so the simulator cannot
  actually demonstrate the ROAS tradeoff it claims to teach.

## Open questions for Ryan

Answer inline; a placeholder ("TBD") blocks the corresponding acceptance
criterion.

1. **What should replace the fixed 2% CTR?** Options: (a) a per-keyword CTR
   field added to `KeywordBid` and authored per scenario, (b) a formula
   derived from match type / keyword intent, (c) something else.
   **Answer:**

2. **What is the actual max-bid formula you use?** E.g. something in the
   family of `maxBid = (conversionRate × revenuePerConversion) / targetRoas`,
   or your own variant. What inputs does it need that
   `BidElevatorInput`/`KeywordBid` don't currently have (conversion rate,
   average order value, current ACOS, break-even ACOS)?
   **Answer:**

3. **Is "cap at 2× current bid" a real rule of thumb, or should it be
   removed / replaced?** If kept, does the multiplier vary by anything
   (match type, days of data, current spend)?
   **Answer:**

4. **What should `estimatedRoas` actually be a function of?** It needs to
   move when the ground-truth bids (or the user's bids) change, not echo
   `targetRoas` unconditionally.
   **Answer:**

5. **What new business-context fields does the scenario need to capture**
   to make the above possible (conversion rate, AOV, current ACOS,
   break-even ACOS, match type, current bid rank/position)? List the exact
   fields and units.
   **Answer:**

6. **Is the ±20% bid-accuracy tolerance right?** Flat for every keyword, or
   should it scale with bid magnitude or keyword volume (e.g. tighter
   tolerance on high-volume keywords where the cost of being wrong is
   larger)?
   **Answer:**

## What ships once answered (mechanical, agent-doable)

Once the formula and required input fields are specified, the code change
itself is ordinary domain-logic work: extend `BidElevatorInput`/`KeywordBid`
with the new fields, replace the ground-truth bid computation and the
`estimatedRoas` derivation with the specified formula, update
`isBidAccurate()`'s tolerance if changed, update the scenario JSON and seed
data to carry the new fields, and write unit tests asserting the new formula
against hand-computed examples Ryan supplies (a worked example per answer
above is the acceptance test, not an invented one).

## Non-goals

- Not in scope: dayparting, placement bidding (top-of-search vs
  product-page), or portfolio-level budget optimization. Keep the story to
  the per-keyword bid model unless Ryan asks to expand it.

## Acceptance criteria (contingent on answers above)

- [ ] Q1–Q6 answered by Ryan (no TBDs remain)
- [ ] `BidElevatorInput`/`KeywordBid`/scenario JSON updated with whatever new
      fields the formula needs
- [ ] Ground-truth bid computation matches Ryan's stated formula, verified
      against at least one worked numeric example he supplies
- [ ] `estimatedRoas` is derived from the actual bids, not echoed from
      `targetRoas`
- [ ] Bid-accuracy tolerance matches Ryan's answer to Q6
- [ ] Domain tests cover the new formula with full branch coverage
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
