# STORY-069: Campaign Builder Rebuild — Scoring Engine Integration

## Context

STORY-039 shipped the original Campaign Builder simulator. It generates a recommended campaign structure (campaigns, ad groups, keywords, match types, bids) from product inputs. It has no concept of user submission, per-dimension scoring, or the attempt lifecycle.

This story rebuilds Campaign Builder to match the pattern used by STR Triage and Bid Elevator: the simulator generates ground truth AND per-dimension scores when user-adjusted campaign structures are supplied. A new `campaignBuilderAttempt()` server action wires it into the full lifecycle.

## Design

### Grading concept

Campaign Builder grades a student's self-built campaign against the ground-truth structure the simulator generates. The user provides their own campaign structure (adjusted from the ground truth or built independently). The simulator compares their structure against ground truth.

### Scoring dimensions for Campaign Builder

| Dimension          | Description                                                | Rubric                                                                                                    |
| ------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `structureQuality` | Does the campaign structure match the ground truth?        | 100 if user has the same campaign count and ad group coverage as ground truth; scales down proportionally |
| `budgetAllocation` | Is the budget distributed reasonably across campaigns?     | 100 if each campaign's spend is within 50% of its ground-truth allocation; scales down otherwise          |
| `keywordRelevance` | Do the user's keywords relate to the product niche?        | 100 if ≥70% of keywords contain niche terms; scales down otherwise                                        |
| `explanation`      | Placeholder (future rubric-based on written justification) | Always 100                                                                                                |

### Flow

```
User input (productCategory + productNiche + monthlyBudget + targetingStrategy)
  + optional userAdjustedCampaigns (the user's submitted campaign structure)
  → validate
  → StartSimulatorAttempt (creates attempt record)
  → CampaignBuilderSimulator.run(input with userAdjustedCampaigns)
    → generates groundTruth campaigns via existing algorithm
    → if userAdjustedCampaigns provided: computes per-dimension scores
    → returns campaigns[] + scoreDimensions (null if no user adjustments)
  → GradeSimulatorAttempt(attemptId, scoreDimensions)
  → ComposeAttemptFeedback(attemptId)
  → return result with ground truth + user's structure + feedback
```

### Backward compatibility

The existing `buildCampaign()` function is kept. It calls the simulator directly with no user adjustments, so `scoreDimensions` is always null and `score` is computed from the structural completeness formula (existing behavior).

## Code shape

### Domain

**`src/domain/simulator/campaign-builder/CampaignBuilderOutput.ts`** (overwrite)

- `ScoreDimensions` interface: `structureQuality`, `budgetAllocation`, `keywordRelevance`, `explanation`
- `CampaignBuilderOutput`: existing fields + `scoreDimensions: ScoreDimensions | null`
- The output's `campaigns` are always the ground truth. When grading, the user's structure is compared against ground truth within the simulator's dimension computation.

**`src/domain/simulator/campaign-builder/CampaignBuilderInput.ts`** (overwrite)

- `CampaignBuilderInput`: existing fields + optional `userAdjustedCampaigns: Readonly<CampaignStructure[]>` — the student's submitted campaign structure

**`src/domain/simulator/campaign-builder/CampaignBuilderSimulator.ts`** (overwrite)

- Keep the existing campaign generation algorithm
- After generating ground truth: if `userAdjustedCampaigns` provided, compare against ground truth:
  - `structureQuality`: % of expected campaign types present × % of expected ad group count matched
  - `budgetAllocation`: for each campaign type, check if user's daily budget for that type is within 50% of ground truth
  - `keywordRelevance`: % of user keywords that contain words from the product niche
  - `explanation`: 100
- `score = structureQuality` (primary dimension when grading)

### Infrastructure

**`scripts/seed-simulator-policies.ts`** (append)

- Add 3 Campaign Builder policies: beginner/practice, intermediate/practice, advanced/challenge
- Dimensions: `structureQuality` (weight 0.40), `budgetAllocation` (weight 0.30), `keywordRelevance` (weight 0.20), `explanation` (weight 0.10)
- Pass thresholds: beginner=50, intermediate=65, advanced=80

### App layer

**`src/app/tools/campaign-builder/actions.ts`** (overwrite)

- `CampaignBuilderAttemptInput`: productCategory, productNiche, monthlyBudget, targetingStrategy, scenarioId, mode, optional userAdjustedCampaigns
- `campaignBuilderAttempt()`: full lifecycle (validate → start → grade → compose feedback → return)
- `buildCampaign()` (legacy): kept for backward compat — wraps simulator directly, scoreDimensions always null

**`src/app/tools/campaign-builder/__tests__/actions.test.ts`** (overwrite)

- Tests for `campaignBuilderAttempt()`: validation, happy path, error propagation, preview mode
- Tests for `buildCampaign()` (legacy): validation, happy path

### Tests

**`tests/unit/domain/simulator/campaign-builder/CampaignBuilderSimulator.test.ts`** (overwrite)

- Ground truth: no userAdjustedCampaigns → returns campaigns, scoreDimensions=null, score=structural completeness
- Structure quality: user provides matching structure → structureQuality=100
- Structure quality: user misses a campaign type → scales down proportionally
- Budget allocation: user distributes budget within ±50% of ground truth → budgetAllocation=100
- Keyword relevance: ≥70% keyword-niche overlap → keywordRelevance=100
- Edge: empty userAdjustedCampaigns, mismatched niche

## Acceptance criteria

- [ ] `CampaignBuilderOutput` has `scoreDimensions: ScoreDimensions | null`
- [ ] `CampaignBuilderInput` accepts optional `userAdjustedCampaigns`
- [ ] Simulator computes all four dimension scores when `userAdjustedCampaigns` provided
- [ ] Preview mode (no userAdjustedCampaigns) returns `scoreDimensions: null`
- [ ] `seed-simulator-policies.ts` seeds 3 campaign-builder policies
- [ ] `campaignBuilderAttempt()` follows full lifecycle: start → grade → compose feedback
- [ ] Legacy `buildCampaign()` still works unchanged
- [ ] All simulator tests pass
- [ ] All action tests pass
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm lint` → 0 errors on new code
- [ ] PR against `main`, CI green, squash merge

## DoD

- Code matches the spec above
- All tests pass
- `pnpm typecheck && pnpm lint && pnpm test` all green
- Conventional commit: `feat(simulator): STORY-069 Campaign Builder rebuild — scoring engine integration`
- PR opened, squash-merged to `main`
- `SESSION-HANDOVER.md` updated
