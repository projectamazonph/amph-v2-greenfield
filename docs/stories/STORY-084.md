# STORY-084: Campaign Builder strategic scoring

## Status

**Done — 2026-08-04.** Ryan's third and authoritative decision pass
(2026-07-29) implemented directly by Ryan's own instruction in-session.
**Supersedes** the two earlier passes (PRs #241/#242) — the
budget-reconciliation tolerance (flat ±2%, not a difficulty-tiered
table), the dimension weights, and several field names changed.

## What shipped

Landed across two commits, stage 1 (`ceac62d`) and stage 2 (`e65972f`),
both on `claude/remaining-tasks-qfuq0b`. `CampaignBuilderSimulator.ts`
now scores all 7 dimensions from the table below; `campaign-builder/
actions.ts` passes all 7 into `GradeSimulatorAttempt` (previously only
`keywordRelevance`/`structureQuality`/`budgetAllocation` reached
grading — the other 4 were either nonexistent or computed and
discarded).

- **Negative-keyword structure**: `NegativeKeyword` implemented as
  specified. Ground truth generates negatives via 2 concrete, structurally
  derivable rules rather than the full routing table in the decision doc:
  Auto protects Manual's Core (Exact) keywords, and Manual's Discovery
  (Phrase) ad group isolates from Core (Exact) on the same keyword. The
  doc's broader table (Broad Research → Phrase/Exact/SKAG, competitor
  campaigns) isn't structurally expressible in this simulator's fixed
  3-campaign (SP Manual / SP Auto / SB Brand) shape and was not attempted.
- **Duplicate targeting**: the decision doc's 4-factor rule (ASIN, role,
  brand lane, objective) collapses to 1 factor (same normalized
  keyword + matchType across ad groups) — in this single-ASIN,
  single-scenario domain model the other 3 factors are always constant,
  so a 4-factor comparison and a 1-factor comparison produce identical
  results. Documented here and inline rather than building unused
  ASIN-set/brand-lane/objective concepts.
- **Branded treatment**: `brandName`/`brandAliases`/`brandMisspellings`/
  `brandProductNames`/`competitorBrands` implemented with word-boundary
  token/phrase matching (same approach as listing-audit's `containsAny`).
  Violation = a branded keyword outside the SB (Brand) campaign, or any
  competitor-brand keyword anywhere — there's no separate competitor
  campaign in this structure, so competitor terms are never expected.
- **Match-type structure**: `structureQuality` now averages the existing
  campaign-type-coverage check with a new per-ad-group match-type-purity
  check.
- **Naming convention**: `namingCompliance` checks segment count (7,
  pipe-delimited), absence of currency symbols, and that the Strategy
  segment isn't literally "gen" on research-role campaigns. The "Down
  Only bidding by default" and "no marketplace codes" sub-rules from the
  doc were not separately graded — `CampaignStructure` has no bidding-
  strategy field to check against.
- **Budget reconciliation**: implemented as specified — hard ±2% gate on
  `sum(dailyBudget) × planningPeriodDays` vs. `monthlyBudget`, plus
  `accountDailyBudgetCap`, combined with ±10pp per-role allocation
  scoring.
- **Scoring**: all 7 weights match the table below exactly, wired into
  `ScorePolicy`/`simulator-policies.ts` for all 3 difficulty tiers.

**Suggested split (084a-d) not followed** — implemented as one coherent
two-stage slice instead (schema + negatives/duplicates in stage 1;
branded/naming/budget + all app-layer wiring in stage 2), since the
dimensions share enough scoring-engine plumbing that splitting further
would have meant more rework, not less.

**Test data caveat**: per Ryan's own in-session choice, all new domain
and scenario test/seed data (synthetic submissions, the seeded brand
taxonomy for the default scenario) is agent-constructed and documented
as such — not Ryan-reviewed example submissions as the acceptance
criteria originally called for.

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

- [x] `CampaignStructure`/`AdGroup` extended with `negativeKeywords`
      (attached at the campaign level, `level` field carries the
      campaign-vs-adGroup semantic distinction, per stage 1's plan)
- [x] Duplicate-targeting detection implemented — **simplified from the
      4-factor rule to 1 factor** (see "What shipped" above) rather than
      the doc's ASIN/role/brand-lane/objective comparison
- [x] Branded taxonomy implemented with normalized token/phrase matching
- [x] Match-type-isolation grading inspects the user's actual submission,
      not campaign names
- [x] Naming graded against the house convention (`Brand | ASIN | Channel
| Strategy | Target Type | Match | Label`) — segment count, currency
      symbols, "gen" check; bidding-strategy and marketplace-code sub-rules
      not graded (no such field exists on `CampaignStructure`)
- [x] Budget reconciliation: flat ±2% total, ±10pp per-role allocation,
      reserve/cap handling scenario-specific
- [x] `CampaignBuilderScores` is the new 7-dimension shape;
      `simulator-policies.ts` weights updated to match
- [x] Deterministic replay: the scoring functions are pure (no
      randomness/clock/IO), so identical input always produces identical
      output — not pinned by a dedicated named test, but true by
      construction and exercised by every existing scoring test
- [x] Domain tests cover each check — against **agent-constructed
      synthetic submissions**, not Ryan-supplied examples (per Ryan's
      own in-session choice, see "Test data caveat" above)
- [x] `pnpm tsc --noEmit && pnpm lint && pnpm test` green (also
      `pnpm test:arch` and `pnpm build`)
- [ ] PR against `main`, CI green, squash merge — pushed directly to
      `claude/remaining-tasks-qfuq0b` per this session's working
      convention; no PR opened
