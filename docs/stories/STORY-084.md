# STORY-084: Campaign Builder strategic scoring

## Status

**Decided.** Ryan's decisions recorded below (2026-07-29). See
`docs/simulator-remediation-decisions.md` for cross-cutting rules.

**Scope note:** negative architecture, a house naming convention, and
budget reconciliation are each separately testable systems. Recommend
splitting; see "Suggested split" below.

## Current mechanism (verbatim, `CampaignBuilderSimulator.ts`)

```ts
// structureQuality: % of {SP Manual, SP Auto, SB} campaign types covered
// budgetAllocation: % of campaigns with budget within 50% of ground truth
// keywordRelevance: % of keywords containing a word from the niche string
```

No negatives concept, no duplication check, no branded distinction, no
match-type-mixing check beyond the ground truth's own template, no
budget-reconciliation check against `monthlyBudget`.

## Decisions

### 1. Negative-keyword architecture

```ts
negativeKeywords: Array<{
  term: string;
  matchType: "negative_exact" | "negative_phrase";
  level: "campaign" | "ad_group";
}>;
```

Research campaigns (broad/phrase/auto discovery) may have harvested exact
terms added as negative-exact to source campaigns when routing isolation
is wanted; phrase negatives reserved for clearly irrelevant concepts.
Performance-exact campaigns are **not** automatically negated against
every other campaign in every scenario — only when the scenario's
routing policy calls for strict isolation:

```ts
routingPolicy: "strict_isolation" | "controlled_overlap" | "discovery_first";
```

Non-branded campaigns negate owned-brand terms when the strategy requires
branded isolation; branded traffic stays in defense campaigns.

### 2. Target duplication is not always wrong

Amazon itself notes using multiple match types for the same keyword
doesn't inherently mean self-competition, and the highest eligible bid
may be used when multiple match types qualify. Treat as an error only
when: same normalized keyword + same match type appears in two campaigns
with the same role, for the same ASIN, with no intentional routing rule,
with conflicting bids/negatives, or in a structure that makes reporting
ownership unclear. Allow when: separate ASINs, separate marketplaces,
one campaign is branded-defense vs. another with a documented separate
role, an explicit controlled test/migration permits it, or different
match types are intentional.

```ts
allowDuplicateTargeting: boolean;
allowedDuplicateReasons: string[];
```

### 3. Branded determination (shared taxonomy with STORY-082)

```ts
brandTerms: string[];
ownedBrandAliases: string[];
competitorBrandTerms: string[];
```

Branded campaigns require: `strategy: "defense"`, owned-brand terms only,
separate budget, no generic/competitor terms unless explicitly allowed,
appropriate negative isolation per the scenario's `routingPolicy`.

### 4. Match-type separation

AMPH default for manually targeted keyword ad groups: one campaign
strategy + one target family + one match type per ad group. Not a
universal Amazon platform requirement — grade explicitly per scenario:

```ts
matchTypeIsolationPolicy: "strict" | "preferred" | "not_required";
```

Strict for performance/research manual campaigns at beginner/intermediate;
not applicable to Auto or product-targeting ad groups. The grader
inspects the user's actual submitted keywords/match types, not campaign
names.

### 5. Naming convention

Replace the current `"{SP|SB} | {MatchType} | {niche} | ₱{budget}/d"` with
the house convention:

```
Brand | ASIN | Channel | Strategy | Target Type | Match | Label
```

e.g. `CasaNook | B0ABC123 | SP | Research | Keyword | Broad | Core`. Rules:
ASIN after brand, no marketplace code, "Defense" for branded defense,
"Research" (not "gen"), branded terms only in branded campaigns, no DSP
field, machine-parseable separators, consistent canonical enum values.
Versioned:

```ts
namingConventionVersion: string;
```

### 6. Budget reconciliation

```
Total submitted daily budget = sum(campaign.dailyBudget)
Expected daily budget = statedMonthlyBudget ÷ planningDays   // planningDays: 30 | 31
```

| Difficulty   | Tolerance |
| ------------ | --------- |
| Beginner     | ±10%      |
| Intermediate | ±5%       |
| Advanced     | ±2%       |

Also grade: no negative budget, no zero-budget active campaign, no
unexplained unallocated amount, no implausible per-campaign share,
objective-aligned allocation, portfolio/account daily cap respected. A
learner may explicitly mark a reserve rather than allocate every dollar:

```ts
unallocatedReserve: number;
reserveReason?: string;
```

### Full dimension set

```ts
type CampaignBuilderScores = {
  strategicCoverage: number; // 20%
  campaignIsolation: number; // 15%
  budgetReconciliation: number; // 15%
  budgetStrategy: number; // 10%
  negativeArchitecture: number; // 15%
  targetingRelevance: number; // 10%
  namingCompliance: number; // 10%
  maintainability: number; // 5%
};
```

## Suggested split

- **STORY-084a:** New 8-dimension scoring schema replacing the current
  3-dimension `ScoreDimensions` (the dimension table above).
- **STORY-084b:** Negative architecture + `routingPolicy` +
  duplication rules (items 1, 2).
- **STORY-084c:** Branded taxonomy + match-type-isolation grading
  (items 3, 4) — coordinate with STORY-082's shared brand taxonomy so
  the two aren't defined twice.
- **STORY-084d:** Naming convention + budget reconciliation (items 5, 6).

## Acceptance criteria

- [ ] Split confirmed (or explicitly kept as one story) before work starts
- [ ] `CampaignStructure`/`AdGroup` extended with `negativeKeywords`
- [ ] `routingPolicy`, `matchTypeIsolationPolicy`, `allowDuplicateTargeting`
      implemented and graded per the rules above
- [ ] Brand taxonomy shared with STORY-082, not redefined separately
- [ ] Naming grades against the house convention, not the old template
- [ ] Budget reconciliation implemented with per-difficulty tolerance,
      reserve handling included
- [ ] `CampaignBuilderScores` is the new 8-dimension shape;
      `seed-simulator-policies.ts` weights updated to match
- [ ] Domain tests cover each new check against Ryan-supplied example
      submissions (a correct one and at least one flawed one per rule)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
