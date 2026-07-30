# STORY-082: Expand STR Triage classifier

## Status

**✅ Done — merged in PR #247.** Ryan's third and authoritative
decision pass (2026-07-29). **Supersedes** the two earlier passes (PRs
#241/#242) — the zero-order statistical formula, the fifth action's name
(`INSUFFICIENT_DATA`, not `collect_more_data`), and several field names
changed.

**Known gap carried forward:** ground truth never produces `harvest_phrase`
(winners are always harvested to Exact) — the action stays in the
taxonomy but no rule currently emits it. Flagged in the PR rather than
inventing an unspecified rule.

**Scope note:** still multiple separately testable rule systems. See
"Suggested split" below.

## Current mechanism (verbatim, `StrTriageSimulator.ts:classify`)

```ts
const avgSpendPerKeyword = 25; // hardcoded, unrelated to actual campaign
```

`KeywordPerfRow` has only `spend`, `revenue`, `orders` — no clicks, no
impressions.

## Decisions (final)

### Replace the $25 constant with the economics of one expected conversion

```
targetAcos = 1 / targetRoas
targetCpa  = averageOrderValue × targetAcos
```

For zero-order terms, calculate the clicks needed before zero
conversions becomes statistically meaningful:

```
zeroOrderClickThreshold = ceil(log(1 - confidenceLevel) / log(1 - expectedCvr))
```

Default `confidenceLevel` = 80%. A zero-order negative candidate
generally requires **both**:

```
spend >= targetCpa
clicks >= zeroOrderClickThreshold
```

Campaign-spend share affects _priority_, not whether a term is good or
bad.

### Required input

**Per search term:**

```ts
searchTerm: string;
impressions: number;
clicks: number;
spend: number;
orders: number;
sales: number;
elapsedDays: number;
sourceCampaignId: string;
sourceAdGroupId: string;
sourceTarget: string;
sourceMatchType: string;
```

**Scenario-level:**

```ts
averageOrderValue: number;
expectedCtrPct: number;
expectedCvrPct: number;
targetRoas: number;
confidenceLevel: number;
minElapsedDays: number;
minOrdersForWinner: number;
brandLexicon: string[];
competitorBrandLexicon: string[];
existingTargets: /* see below */;
```

Use impressions to evaluate relevance/CTR, but do not negate a term
purely for low CTR without evidence:

```
minImpressionsForCtrEvaluation = max(250, ceil(5 / expectedCtr))
```

### Existing-target detection

```ts
existingTargets: Array<{
  text: string;
  normalizedText: string;
  matchType: string;
  campaignId: string;
  adGroupId: string;
  campaignRole: string;
  state: string;
}>;
```

Rules: a winning term already Exact in the correct campaign →
maintain/adjust, don't duplicate. Exists only as Broad/Phrase → may still
harvest to Exact. When harvested, add a negative-exact to the source
Research campaign when isolation is intended. Wrong branded/non-branded
lane → recommend routing/restructuring.

### Negative precision

Default to **negative-exact** for a single poor search term. Use
**negative-phrase** only when: a clearly irrelevant theme is proven
across ≥3 distinct search terms with sufficient combined evidence; an
incompatible attribute should always be excluded; or brand/competitor
isolation requires routing every search containing the phrase elsewhere.
Do not negative-phrase a harvested winner by default — it can
unnecessarily block valuable long-tail search.

### Branded detection

Scenario-authored brand dictionaries, **normalized word/phrase matching,
not loose substrings**. Classify each term: `ownBrand` | `competitorBrand`
| `generic`. Own-brand terms belong in Defense campaigns — if one appears
in Research or Performance, recommend routing to Defense even when
profitable. Separate scenario fields:

```ts
brandTargetRoas: number;
genericTargetRoas: number;
competitorTargetRoas: number;
```

Competitor terms normally require stronger evidence (≥3 orders) before
promotion.

### Insufficient data: a real fifth action

```ts
type TriageAction =
  | "HARVEST_EXACT"
  | "HARVEST_PHRASE" // adapt casing to house TS convention at implementation time
  | "NEGATIVE_EXACT"
  | "NEGATIVE_PHRASE"
  | "KEEP"
  | "PAUSE"
  | "INSUFFICIENT_DATA";
```

`INSUFFICIENT_DATA` teaches that restraint is a valid decision. Default
confidence requirements: ≥7 elapsed days; ≥2 orders for a winner
classification; zero-order losers need **both** the target-CPA and
click-count thresholds; otherwise monitor / insufficient data. No
decision becomes "confident" because it crossed an arbitrary spend line.

## Suggested split

- **STORY-082a:** Clicks/impressions/evidence fields + `targetCpa`/
  zero-order statistical thresholds + `INSUFFICIENT_DATA` action.
- **STORY-082b:** Existing-target detection + negative-precision rules.
- **STORY-082c:** Branded detection + per-brand-class target ROAS
  routing.

## Acceptance criteria

- [ ] `$25` constant removed, replaced by `targetCpa` + statistical
      `zeroOrderClickThreshold` formulas above
- [ ] `StrTriageInput`/`KeywordPerfRow` carry every new field
      (impressions, elapsedDays, source campaign/ad-group/target/match
      type)
- [ ] `existingTargets` detection implemented per the stated rules
- [ ] Negative-exact vs. negative-phrase distinguished per the stated
      evidence rules
- [ ] Branded routing implemented with per-brand-class target ROAS
- [ ] `INSUFFICIENT_DATA` implemented with the stated evidence thresholds
- [ ] Deterministic-replay test: same scenario + engine version → identical
      output
- [ ] Domain tests cover each formula and rule against worked numeric
      examples
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
