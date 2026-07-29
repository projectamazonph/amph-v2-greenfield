# STORY-084: Campaign Builder strategic scoring

## Status

**Final — ready for implementation.** Ryan's third and authoritative
decision pass (2026-07-29). **Supersedes** the two earlier passes (PRs
#241/#242) — the budget-reconciliation tolerance (flat ±2%, not a
difficulty-tiered table), the dimension weights, and several field names
changed.

## Current mechanism (verbatim, `CampaignBuilderSimulator.ts`)

Only checks campaign-type coverage, budget within ±50% per type, and
niche-word substring match in keywords. No negatives, duplication check,
branded isolation, match-type-mixing check, or budget reconciliation.

## Decisions (final)

### Negative-keyword structure

```ts
negativeKeywords: Array<{
  text: string;
  matchType: "negativeExact" | "negativePhrase";
  level: "campaign" | "adGroup";
  reason: string;
}>;
```

Expected routing: Auto and Broad Research campaigns receive
negative-exact entries for keywords moved into Phrase, Exact, or
SKAG/Performance structures. Phrase Research campaigns receive
negative-exact entries for keywords moved into Exact or SKAG/Performance.
Non-branded campaigns receive brand negatives so branded traffic stays in
Defense. Generic campaigns may receive competitor-brand negatives when a
separate competitor campaign exists. Negative-phrase is reserved for
proven-irrelevant themes or explicit routing rules.

### Duplicate targeting

Same normalized keyword + match type is an **error** only when **all**
of these match: advertised ASIN/ASIN-set, campaign role, brand lane,
targeting objective. Exact/Phrase/Broad versions of the same keyword are
**not automatically duplicates**, provided the negative-routing structure
prevents uncontrolled overlap. Allowed when: different ASINs are
intentionally advertised; the campaigns have an explicit testing or
placement-isolation purpose; the scenario contains a documented
duplication justification. For a single-ASIN beginner scenario, duplicate
keyword+match-type targets should be graded wrong.

### Branded treatment

```ts
brandName: string;
brandAliases: string[];
brandMisspellings: string[];
brandProductNames: string[];
competitorBrands: string[];
```

Normalized **token and phrase** matching, not substring matching. Rules:
own-brand terms belong only in Defense. Generic Research/Performance
campaigns exclude own-brand traffic. Competitor terms belong in a
separate competitor strategy where one exists. A combined query
containing the brand _and_ a generic product term is still branded.

### Match-type structure

"One match type per ad group" is the house rule and is graded explicitly
— a training-architecture rule, not an Amazon platform limitation.
Multiple relevant keywords with the same match type may share an ad
group. Broad/Phrase/Exact must not be mixed within one ad group. Keyword
targeting, product targeting, and Auto targeting must not be mixed. SKAG
is a deliberate special structure, not the default for every keyword.

### Naming convention

```
Brand | ASIN | Channel | Strategy | Target Type | Match | Label
```

e.g. `Acme | B0ABC123 | SP | Research | Keyword | Broad | Core`. Rules:
"Defense" for branded campaigns; "Research," not "gen"; branded terms
stay out of Performance; no marketplace codes or budgets in the name;
**Down Only bidding by default** unless the scenario explicitly teaches
another bidding strategy.

### Budget reconciliation

```ts
monthlyBudget: number;
planningPeriodDays: number;
accountDailyBudgetCap: number; // scenario-specific, never a hardcoded universal
```

```
plannedSpend = sum(campaign.dailyBudget) × planningPeriodDays
```

Require planned spend within **±2%** of the stated monthly budget — the
explicit `planningPeriodDays` field prevents 30-day-vs-30.4-day
ambiguity. Campaign-role allocation uses scenario-defined acceptable
ranges, normally within **±10 percentage points** of the target
allocation (the current ±50% tolerance is too loose to teach anything).

### Scoring

| Dimension                             | Weight |
| ------------------------------------- | ------ |
| Keyword relevance and intent coverage | 20%    |
| Campaign/ad-group structure           | 20%    |
| Negative routing and harvesting       | 20%    |
| Budget reconciliation and allocation  | 15%    |
| Branded isolation                     | 10%    |
| Duplicate/cannibalization control     | 10%    |
| Naming compliance                     | 5%     |

Naming matters but never rescues a strategically broken campaign plan —
a well-named dumpster fire is still a dumpster fire.

## Suggested split

- **STORY-084a:** New 7-dimension scoring schema replacing the current
  3-dimension `ScoreDimensions`.
- **STORY-084b:** Negative architecture + routing rules + duplication
  detection.
- **STORY-084c:** Branded taxonomy + match-type-isolation grading
  (coordinate with STORY-082's shared brand-detection approach so the two
  aren't defined twice).
- **STORY-084d:** Naming convention + budget reconciliation (flat ±2%
  total, ±10pp per-role allocation).

## Acceptance criteria

- [ ] `CampaignStructure`/`AdGroup` extended with `negativeKeywords`
- [ ] Duplicate-targeting detection implemented per the 4-factor rule
      (ASIN, role, brand lane, objective) — not a blanket "same
      keyword+match-type is always wrong"
- [ ] Branded taxonomy implemented with normalized token/phrase matching
- [ ] Match-type-isolation grading inspects the user's actual submission,
      not campaign names
- [ ] Naming graded against the house convention (`Brand | ASIN | Channel
  | Strategy | Target Type | Match | Label`)
- [ ] Budget reconciliation: flat ±2% total, ±10pp per-role allocation,
      reserve/cap handling scenario-specific
- [ ] `CampaignBuilderScores` is the new 7-dimension shape;
      `seed-simulator-policies.ts` weights updated to match
- [ ] Deterministic-replay test: same scenario + engine version → identical
      output
- [ ] Domain tests cover each check against Ryan-supplied example
      submissions (correct + at least one flawed per rule)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
