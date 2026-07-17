# STORY-037 — Bid Elevator Simulator

## Status

- [ ] Doc written (you are here)
- [ ] Tests written (Red)
- [ ] Production code written (Green)
- [ ] Refactored
- [ ] Committed, PR open

## Context

STORY-036 built the `Simulator<TIn, TOut>` infrastructure. STORY-037 replaces the `StubSimulator` for `bid-elevator` with a real working simulator.

**The Bid Elevator** is an Amazon PPC training tool where the user adjusts keyword bids to maximize ROAS within a fixed daily budget. It's an interactive what-if tool — not a passive quiz.

## User Flow

1. User opens `/dashboard/simulators/bid-elevator`
2. Server fetches a `SimulatorScenario` from the registry for `bid-elevator`
3. Page renders the scenario input form (keywords, budget, target ROAS) using the scenario's `inputSchema`
4. User fills the form and clicks "Run Simulation"
5. Server calls `simulatorRegistry.get("bid-elevator")?.run(input)`
6. Results render: bid recommendations, estimated spend, estimated ROAS

**This story only covers steps 3–6** for the Bid Elevator. No new scenario data model, no new pages for other simulators. No quiz mode (that's STORY-038).

## Acceptance Criteria

1. `BidElevatorSimulator` implements `Simulator<BidElevatorInput, BidElevatorOutput>`
2. `BidElevatorInput` = `{ keywords: KeywordBid[], budget: number, targetRoas: number }` where `KeywordBid = { keyword: string; currentBid: number; currentCpc: number; volume: number }`
3. `BidElevatorOutput` = `{ bids: KeywordBid[], estimatedSpend: number; estimatedRoas: number; score: number }` — score is 0–100 based on how close to target ROAS
4. Scoring logic:
   - Calculate total spend = Σ(keyword.bid × keyword.volume)
   - Calculate estimated revenue = total spend × targetRoas
   - Score = 100 if estimatedRoas ≥ targetRoas × 0.95, else scale linearly down to 0
   - Raise bids on high-volume keywords, lower bids on low-volume keywords proportionally
5. `BidElevatorSimulator` replaces `StubSimulator` in `buildSimulatorRegistry()` — `registry.get("bid-elevator")` now returns the real thing
6. Unit tests for `BidElevatorSimulator.run()` — happy path, zero budget, zero volume edge cases
7. Container wiring test verifies `registry.get("bid-elevator")` is not a `StubSimulator`

## Code Shape

```
src/
  domain/
    simulator/
      bid-elevator/
        BidElevatorInput.ts     # input types
        BidElevatorOutput.ts    # output types
        BidElevatorSimulator.ts # the real implementation

tests/
  unit/
    domain/
      simulator/
        bid-elevator/
          BidElevatorSimulator.test.ts
```

The existing `src/ports/simulator/` and `src/infra/simulator/` are untouched — only `buildSimulatorRegistry.ts` changes.

## Design Notes

- The scoring algorithm is intentionally simple. Real Amazon PPC ROAS optimization involves conversion rates, historical data, match types, etc. — that's future scope.
- The simulator is a pure domain function — no side effects, no API calls. Easy to test.
- The page/route itself is **not** in this story. That's a separate story for the UI layer.
- `BidElevatorSimulator` lives in `src/domain/simulator/bid-elevator/` not `src/usecases/` — it's a pure domain service, not a use case (no container injection needed).
