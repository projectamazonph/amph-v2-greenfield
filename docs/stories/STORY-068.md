# STORY-068: Bid Elevator Rebuild — Scoring Engine Integration

## Context

STORY-037 shipped the original Bid Elevator simulator. It computes suggested bids and a flat 0-100 score based on ROAS hit. It has no concept of user submission, per-dimension scoring, or the attempt lifecycle (start → grade → feedback).

STORY-065 built the scoring engine: `ScorePolicy`, `GradeSimulatorAttempt`, `ComposeAttemptFeedback`, `AttemptFeedback`. STORY-066 wired feedback composition into the action layer.

This story rebuilds Bid Elevator to match the STR Triage pattern: the simulator's `run()` now computes ground-truth bid recommendations AND per-dimension scores when user-adjusted bids are supplied. A new `bidElevatorAttempt()` server action wires it into the full lifecycle.

## Design

### Scoring dimensions for Bid Elevator

| Dimension         | Description                                                | Rubric                                                  |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `bidAccuracy`     | % of keywords where user's bid is within ±20% of suggested | 100 if \|userBid - suggestedBid\| / suggestedBid ≤ 0.20 |
| `budgetAdherence` | % of simulated spend that stays within daily budget        | 100 if estimatedSpend ≤ budget; scales down linearly    |
| `roasHit`         | % of target ROAS achieved by user's adjusted bids          | 100 × (estimatedRoas / targetRoas), capped at 100       |
| `explanation`     | Placeholder (future rubric-based on written justification) | Always 100                                              |

### Flow

```
User input (keywords + budget + targetRoas + optional userBidAdjustments)
  → validate
  → StartSimulatorAttempt (creates attempt record, status = in_progress)
  → BidElevatorSimulator.run(input with userBidAdjustments)
    → computes groundTruth (suggested bids) via existing algorithm
    → if userBidAdjustments provided: computes per-dimension scores
    → returns bids[] + scoreDimensions (null if no user adjustments)
  → GradeSimulatorAttempt(attemptId, scoreDimensions)
    → persists grade to DB
  → ComposeAttemptFeedback(attemptId)
    → generates actionable feedback
  → return result with bids + per-keyword breakdown + feedback
```

### Backward compatibility

The existing `runBidElevator()` function is kept. It calls the simulator directly with no user adjustments, so `scoreDimensions` is always null and `score` is computed from the ROAS formula (existing behavior). Students using the tool in preview/exploration mode will not have their session graded.

## Code shape

### Domain

**`src/domain/simulator/bid-elevator/BidElevatorOutput.ts`** (overwrite)

- `BidRecommendation` interface: `keyword`, `suggestedBid`, `currentBid`, `estimatedCpc`, `volume`, `groundTruth` (the suggested bid), `userBid` (optional), `isCorrect` (optional)
- `ScoreDimensions` interface: `bidAccuracy`, `budgetAdherence`, `roasHit`, `explanation`
- `BidElevatorOutput`: `bids[]`, `estimatedSpend`, `estimatedRoas`, `score`, `scoreDimensions | null`

**`src/domain/simulator/bid-elevator/BidElevatorInput.ts`** (overwrite)

- `KeywordBid` unchanged
- `BidElevatorInput`: existing fields + optional `userBidAdjustments: Readonly<Record<string, number>>` (keyword → user-submitted bid)

**`src/domain/simulator/bid-elevator/BidElevatorSimulator.ts`** (overwrite)

- Keep the existing bid-algorithm logic (volume-weighted allocation, 2× bid cap)
- After computing suggested bids: if `userBidAdjustments` provided, for each keyword:
  - `groundTruth = suggestedBid`
  - `userBid = userBidAdjustments[keyword]`
  - `isCorrect = |userBid - groundTruth| / groundTruth ≤ 0.20`
- Compute `scoreDimensions`:
  - `bidAccuracy` = % of keywords where `isCorrect`
  - `budgetAdherence` = `min(100, 100 × budget / estimatedSpend)` (spend stays within budget)
  - `roasHit` = `min(100, 100 × estimatedRoas / targetRoas)`
  - `explanation` = 100
- `score = scoreDimensions?.bidAccuracy ?? 100`

### Infrastructure

**`scripts/seed-simulator-policies.ts`** (append)

- Add 3 Bid Elevator policies: beginner/practice, intermediate/practice, advanced/challenge
- Dimensions: `bidAccuracy` (weight 0.40), `budgetAdherence` (weight 0.30), `roasHit` (weight 0.20), `explanation` (weight 0.10)
- Pass thresholds: beginner=50, intermediate=65, advanced=80

### App layer

**`src/app/tools/bid-elevator/actions.ts`** (overwrite)

- `BidElevatorAttemptInput`: keywords, budget, targetRoas, scenarioId, mode, optional userBidAdjustments
- `bidElevatorAttempt()`: full lifecycle (validate → start → grade → feedback → return)
  - Validates keywords (non-empty, all positive numbers), budget > 0, targetRoas > 0
  - Calls `container.startSimulatorAttempt`, `container.gradeSimulatorAttempt`, `container.composeAttemptFeedback`
  - Returns `{ ok, value: { attemptId, overallScore, scoreDimensions, isPassed, bids, feedback } }`
- `runBidElevator()` (legacy): kept for backward compat — wraps simulator directly, score always from ROAS formula, scoreDimensions always null

**`src/app/tools/bid-elevator/__tests__/actions.test.ts`** (overwrite)

- Tests for `bidElevatorAttempt()`: validation errors, happy path, error propagation from each use case, per-bid results
- Tests for `runBidElevator()` (legacy): validation, happy path

### Tests

**`tests/unit/domain/simulator/bid-elevator/BidElevatorSimulator.test.ts`** (overwrite)

- Ground truth: no userBidAdjustments → returns suggested bids, score=100, scoreDimensions=null
- Bid accuracy: userBid within ±20% → isCorrect=true; outside → isCorrect=false
- bidAccuracy dimension: 100% correct → 100, 0% correct → 0, 50% → 50
- budgetAdherence dimension: spend ≤ budget → 100; spend > budget → scales down
- roasHit dimension: estimatedRoas = targetRoas → 100; half → 50; exceeds → capped at 100
- explanation dimension: always 100
- Overall: score = bidAccuracy when grading; score = 100 when preview
- edge: empty keywords, zero budget, zero volume, user bid for non-existent keyword
- backward compat: no userBidAdjustments → old behavior preserved

## Acceptance criteria

- [ ] `BidElevatorOutput` has `scoreDimensions: ScoreDimensions | null`
- [ ] `BidRecommendation` has `groundTruth`, `userBid` (optional), `isCorrect` (optional)
- [ ] `BidElevatorInput` accepts optional `userBidAdjustments`
- [ ] Simulator computes all four dimension scores when `userBidAdjustments` provided
- [ ] Preview mode (no userBidAdjustments) returns `scoreDimensions: null`, `score: 100`
- [ ] `seed-simulator-policies.ts` seeds 3 bid-elevator policies
- [ ] `bidElevatorAttempt()` follows full lifecycle: start → grade → compose feedback
- [ ] Legacy `runBidElevator()` still works unchanged
- [ ] 23+ simulator tests pass
- [ ] 12+ action tests pass
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm lint` → 0 errors on new code
- [ ] PR against `main`, CI green, squash merge

## DoD

- Code matches the spec above
- All tests pass (simulator unit tests + action tests)
- `pnpm typecheck && pnpm lint && pnpm test` all green
- Conventional commit: `feat(simulator): STORY-068 Bid Elevator rebuild — scoring engine integration`
- PR opened, squash-merged to `main`
- `SESSION-HANDOVER.md` updated
