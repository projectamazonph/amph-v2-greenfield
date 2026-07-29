# STORY-082: Expand STR Triage classifier

## Status

**Decided.** Ryan's decisions recorded below (2026-07-29). See
`docs/simulator-remediation-decisions.md` for cross-cutting rules.

**Scope note:** existing-target detection, negative-type distinction, and
branded routing are each meaningfully separate rule systems. Recommend
splitting; see "Suggested split" below.

## Current mechanism (verbatim, `StrTriageSimulator.ts:classify`)

```ts
const avgSpendPerKeyword = 25; // hardcoded, unrelated to actual campaign
const spendRatio = row.spend / avgSpendPerKeyword;
if (roas >= targetRoas * 0.8 && spendRatio < 0.3) return "add_as_exact";
if (roas >= targetRoas * 0.7 && roas < targetRoas && spendRatio >= 0.5) return "add_as_phrase";
if (roas < targetRoas && spendRatio > 0.8) return "pause";
return "keep";
```

`KeywordPerfRow` has only `spend`, `revenue`, `orders` — no clicks, no
impressions.

## Decisions

### 1. Replace the $25 constant with economic decision thresholds

Not campaign-spend share alone. Break-even click threshold:

```
Break-even click threshold = averageOrderValue × breakEvenAcos ÷ currentCpc
```

Zero-order review threshold, from expected clicks per order:

```
Expected clicks per order = 1 ÷ expectedCvr
Zero-order review threshold = expectedClicksPerOrder × confidenceMultiplier
```

Worked example: CVR 10% → 10 clicks/order; multiplier 1.5 → review
threshold 15 clicks. Secondary check, spend-based:
`Zero-order spend threshold = targetCpc × zeroOrderClickThreshold`.

### 2. Add clicks and impressions

```ts
impressions: number;
clicks: number;
spend: number;
orders: number;
sales: number;
unitsOrdered?: number;
evaluationDays: number;
// derived: ctr, cpc, cvr, acos, roas
```

Default sufficiency thresholds (training defaults, not universal Amazon
rules — versioned per `docs/simulator-remediation-decisions.md`):

```ts
minimumClicksForNegativeDecision: 12;
minimumClicksForHarvestDecision: 8;
minimumOrdersForHarvest: 2;
minimumOrdersForBidIncrease: 3;
minimumEvaluationDays: 7;
```

### 3. Existing-target detection

```ts
existingTargets: Array<{
  normalizedTerm: string;
  matchType: "exact" | "phrase" | "broad";
  campaignId: string;
  adGroupId: string;
  campaignRole: "defense" | "research" | "performance";
  state: "enabled" | "paused";
}>;
existingNegatives: Array<{
  normalizedTerm: string;
  negativeMatchType: "negative_exact" | "negative_phrase";
  campaignId?: string;
  adGroupId?: string;
}>;
```

Rules: qualified term not in exact → harvest exact. Already in intended
exact destination → don't duplicate. Present in wrong campaign role →
recommend routing correction. Already negative → flag conflict. Existing
exact paused → recommend review, not automatic duplication.

### 4. Distinguish negative-exact from negative-phrase

Negative-exact: the specific term is poor, but close variations may still
be useful, term is ambiguous, or evidence is limited to that exact query.
Negative-phrase: a whole phrase/concept is categorically irrelevant,
every containing variation is undesirable, wrong product
type/material/audience/size/use-case, or compliance/brand policy requires
exclusion.

### 5. Branded determination

```ts
brandTerms: string[];
ownedBrandAliases: string[];
competitorBrandTerms: string[];
// normalize: lowercase, strip punctuation, collapse spaces, match aliases/token boundaries
brandClass: "owned_brand" | "competitor_brand" | "generic" | "ambiguous";
```

Owned brand → route to defense campaigns, defense-appropriate
profitability thresholds, never harvest into generic performance
campaigns. Competitor brand → route to competitor-targeting campaigns,
stricter relevance/profitability thresholds, never treated as generic
discovery.

### 6. Add a fifth action: `collect_more_data`

```ts
type TriageAction =
  | "harvest_exact" | "harvest_phrase"
  | "negative_exact" | "negative_phrase"
  | "reduce_source_bid" | "increase_bid"
  | "keep" | "pause_target"
  | "collect_more_data"
  | "escalate_listing" | "escalate_profitability";

primaryAction: TriageAction;
secondaryActions: TriageAction[];
confidence: "low" | "medium" | "high";
```

A row must not be confidently graded pause/harvest/negate before minimum
evidence, unless it's unmistakably irrelevant.

## Decision-pack refinements (implementation-ready, 2026-07-29 second pass)

Row-level fields, more specific than the earlier pass — `expectedCvr`,
`targetCpc`, `averageOrderValue`, `targetAcos`, `breakEvenAcos` belong on
each `KeywordPerfRow`, not only at scenario level, since the break-even
and zero-order thresholds are computed per-row:

```
expectedClicksPerOrder = 1 ÷ expectedCvr
zeroOrderReviewThreshold = expectedClicksPerOrder × confidenceMultiplier
zeroOrderSpendThreshold = targetCpc × zeroOrderReviewThreshold
breakEvenClickThreshold = averageOrderValue × breakEvenAcos ÷ currentCpc
```

Required tests:

- Low-click, zero-order rows are held for more data
  (`collect_more_data`), not force-classified.
- High-click, zero-order, clearly irrelevant rows can receive
  `negative_exact` or `negative_phrase`.
- An existing exact target suppresses a duplicate harvest recommendation.
- A **paused** existing exact target triggers a review recommendation,
  not silent duplication.
- Brand aliases normalize safely (case, punctuation, spacing).
- Conflicting existing negatives surface as explicit errors/warnings, not
  silently ignored.

## Suggested split

- **STORY-082a:** Clicks/impressions input fields + new sufficiency
  thresholds + `collect_more_data` action (items 2, 6).
- **STORY-082b:** Economic thresholds replacing the $25 constant (item 1).
- **STORY-082c:** Existing-target/negative-conflict detection (item 3).
- **STORY-082d:** Negative-type distinction + branded routing
  (items 4, 5).

## Acceptance criteria

- [ ] Split confirmed (or explicitly kept as one story) before work starts
- [ ] `avgSpendPerKeyword` constant removed, replaced by the break-even /
      zero-order threshold formulas above
- [ ] `StrTriageInput`/`KeywordPerfRow` extended with clicks, impressions,
      existing targets, existing negatives, brand-term lists
- [ ] `TriageAction` extended with `collect_more_data` and the confidence/
      secondary-actions shape
- [ ] Negative-exact vs. negative-phrase distinguished per the stated
      rules
- [ ] Branded routing implemented (owned vs. competitor vs. generic vs.
      ambiguous)
- [ ] Domain tests cover each new rule against worked numeric examples
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
