/**
 * BidElevatorSimulator tests.
 *
 * STORY-079: Bid Elevator economic model rewrite.
 *
 * Test groups:
 *  1. Edge cases (empty keywords, zero budget, zero simulation days)
 *  2. Economic ceiling (the $0.90 worked example from STORY-079.md)
 *  3. Recommended bid: reaches the ceiling when sales keep rising to it,
 *     but stops short of the ceiling once impression share saturates
 *  4. Budget pacing (unconstrained spend throttled to the available budget)
 *  5. The change guardrail (maxBidChangePct)
 *  6. Estimated ROAS responds to the chosen bids, never echoes targetRoas
 *  7. Evidence-based tolerance tiers + bid accuracy
 *  8. Outcome grading (full / partial / capped credit)
 *  9. Ordering, determinism, backward-compatible shape
 */

import { describe, it, expect } from "vitest";
import { BidElevatorSimulator } from "@/domain/simulator/bid-elevator/BidElevatorSimulator";
import type {
  BidElevatorInput,
  BidElevatorKeywordScenario,
} from "@/domain/simulator/bid-elevator/BidElevatorInput";

const simulator = new BidElevatorSimulator();

// ── Fixture builders ──────────────────────────────────────────────────────

/**
 * The STORY-079.md worked example: CVR 12%, revenue/order $30, target
 * ROAS 4 (target ACoS 25%) -> economic ceiling = 0.12 * 30 * 0.25 = $0.90.
 * benchmarkCpc = $0.60 means the ceiling corresponds to bidRatio 1.5,
 * exactly where the CPC-multiplier formula also caps out, so sales keep
 * rising the whole way to the ceiling (elasticity 1.5, no early
 * saturation) -- the recommended bid should land at the ceiling.
 */
function baselineKeyword(
  overrides: Partial<BidElevatorKeywordScenario> = {},
): BidElevatorKeywordScenario {
  return {
    keywordId: "kw1",
    keyword: "wireless earbuds",
    matchType: "exact",
    intent: "generic",
    strategicRole: "performance",
    currentBid: 0.5,
    baselineBid: 0.5,
    baselineCtrPct: 2,
    baselineCvrPct: 12,
    benchmarkCpc: 0.6,
    availableImpressionsPerDay: 10000,
    maxImpressionSharePct: 40,
    bidElasticity: 1.5,
    evidenceClicks: 40,
    evidenceOrders: 5,
    evidenceWindowDays: 30,
    ...overrides,
  };
}

function baselineScenario(
  overrides: Partial<BidElevatorInput> = {},
  keywords: readonly BidElevatorKeywordScenario[] = [baselineKeyword()],
): BidElevatorInput {
  return {
    currencyCode: "USD",
    dailyBudget: 1000,
    simulationDays: 1,
    targetRoas: 4,
    breakEvenAcosPct: 40,
    defaultRevenuePerOrder: 30,
    minimumBidIncrement: 0.05,
    keywords,
    ...overrides,
  };
}

// ── Edge cases ────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("returns empty result when keywords array is empty", async () => {
    const input = baselineScenario({}, []);
    const result = await simulator.run(input);
    expect(result.bids).toHaveLength(0);
    expect(result.estimatedSpend).toBe(0);
    expect(result.estimatedRoas).toBe(0);
    expect(result.score).toBe(0);
    expect(result.scoreDimensions).toBeNull();
  });

  it("returns empty result when dailyBudget is zero", async () => {
    const input = baselineScenario({ dailyBudget: 0 });
    const result = await simulator.run(input);
    expect(result.bids).toHaveLength(0);
    expect(result.score).toBe(0);
  });

  it("returns empty result when simulationDays is zero", async () => {
    const input = baselineScenario({ simulationDays: 0 });
    const result = await simulator.run(input);
    expect(result.bids).toHaveLength(0);
    expect(result.score).toBe(0);
  });

  it("recommends a zero bid when the economic ceiling is zero", async () => {
    const input = baselineScenario({}, [baselineKeyword({ baselineCvrPct: 0 })]);
    const result = await simulator.run(input);
    expect(result.bids[0]!.economicCeiling).toBe(0);
    expect(result.bids[0]!.groundTruth).toBe(0);
    expect(result.bids[0]!.estimatedSales).toBe(0);
  });
});

// ── Economic ceiling ──────────────────────────────────────────────────────

describe("economic ceiling", () => {
  it("matches the worked example: CVR 12%, revenue/order $30, target ROAS 4 -> $0.90", async () => {
    const input = baselineScenario();
    const result = await simulator.run(input);
    expect(result.bids[0]!.economicCeiling).toBeCloseTo(0.9, 2);
  });

  it("uses break-even ACoS when it is tighter than target ACoS", async () => {
    // targetRoas 2 -> targetAcos 50%; breakEvenAcosPct 20% is tighter and must win
    const input = baselineScenario({ targetRoas: 2, breakEvenAcosPct: 20 });
    const result = await simulator.run(input);
    // ceiling = 0.12 * 30 * 0.20 = 0.72, not 0.12 * 30 * 0.50 = 1.80
    expect(result.bids[0]!.economicCeiling).toBeCloseTo(0.72, 2);
  });

  it("respects a per-keyword revenuePerOrder override", async () => {
    const input = baselineScenario({}, [baselineKeyword({ revenuePerOrder: 60 })]);
    const result = await simulator.run(input);
    // ceiling = 0.12 * 60 * 0.25 = 1.80 (double the $30 default-revenue case)
    expect(result.bids[0]!.economicCeiling).toBeCloseTo(1.8, 2);
  });
});

// ── Recommended bid ───────────────────────────────────────────────────────

describe("recommended bid", () => {
  it("reaches the ceiling when sales keep rising the whole way there", async () => {
    const input = baselineScenario();
    const result = await simulator.run(input);
    expect(result.bids[0]!.groundTruth).toBeCloseTo(result.bids[0]!.economicCeiling, 2);
  });

  it("stops well short of the ceiling once impression share saturates", async () => {
    // High elasticity + a low benchmarkCpc relative to the ceiling means
    // impression share is already ~saturated at a small fraction of the
    // ceiling bid ratio -- bidding further up to the ceiling buys no more
    // sales, so the search should not recommend the ceiling itself.
    const input = baselineScenario({}, [baselineKeyword({ benchmarkCpc: 0.1, bidElasticity: 6 })]);
    const result = await simulator.run(input);
    expect(result.bids[0]!.groundTruth).toBeLessThan(result.bids[0]!.economicCeiling * 0.7);
    expect(result.bids[0]!.groundTruth).toBeGreaterThan(0);
  });

  it("never recommends a bid above the economic ceiling", async () => {
    const input = baselineScenario({}, [
      baselineKeyword({ benchmarkCpc: 0.05, bidElasticity: 0.5 }),
    ]);
    const result = await simulator.run(input);
    expect(result.bids[0]!.groundTruth).toBeLessThanOrEqual(result.bids[0]!.economicCeiling);
  });
});

// ── Budget pacing ─────────────────────────────────────────────────────────

describe("budget pacing", () => {
  it("scales delivered spend down to the available budget when unconstrained spend exceeds it", async () => {
    // A tiny daily budget relative to the keyword's available volume forces pacing.
    const input = baselineScenario({ dailyBudget: 1, simulationDays: 1 });
    const result = await simulator.run(input);
    expect(result.estimatedSpend).toBeLessThanOrEqual(1.01); // small float tolerance
  });

  it("does not scale down when the budget comfortably covers unconstrained spend", async () => {
    const input = baselineScenario({ dailyBudget: 100000, simulationDays: 1 });
    const result = await simulator.run(input);
    // Spend should equal the unconstrained forecast, well under the budget.
    expect(result.estimatedSpend).toBeLessThan(100000);
    expect(result.estimatedSpend).toBeGreaterThan(0);
  });
});

// ── Change guardrail ──────────────────────────────────────────────────────

describe("change guardrail (maxBidChangePct)", () => {
  it("without a guardrail, a low current bid does not block a move to the full ceiling", async () => {
    const input = baselineScenario({}, [baselineKeyword({ currentBid: 0.1 })]);
    const result = await simulator.run(input);
    expect(result.bids[0]!.groundTruth).toBeCloseTo(result.bids[0]!.economicCeiling, 2);
  });

  it("with a guardrail, the recommended bid stays within the allowed change from currentBid", async () => {
    const input = baselineScenario({ maxBidChangePct: 15 }, [baselineKeyword({ currentBid: 0.1 })]);
    const result = await simulator.run(input);
    // currentBid 0.10 +/- 15% -> at most 0.115, far below the $0.90 ceiling.
    // Output bids round to the cent, and 0.115 rounds up to 0.12.
    expect(result.bids[0]!.groundTruth).toBeLessThanOrEqual(0.12);
  });

  it("a bad high current bid does not authorize doubling past the ceiling", async () => {
    const input = baselineScenario({ maxBidChangePct: 15 }, [baselineKeyword({ currentBid: 5.0 })]);
    const result = await simulator.run(input);
    expect(result.bids[0]!.groundTruth).toBeLessThanOrEqual(result.bids[0]!.economicCeiling);
  });
});

// ── Estimated ROAS responds to bids ───────────────────────────────────────

describe("estimated ROAS", () => {
  it("never equals targetRoas by construction", async () => {
    const input = baselineScenario({ targetRoas: 4 });
    const result = await simulator.run(input);
    expect(result.estimatedRoas).not.toBe(4);
  });

  it("changes when a keyword's economics change", async () => {
    const cheaperKeyword = baselineScenario({}, [baselineKeyword({ benchmarkCpc: 0.3 })]);
    const pricierKeyword = baselineScenario({}, [baselineKeyword({ benchmarkCpc: 1.2 })]);
    const cheaperResult = await simulator.run(cheaperKeyword);
    const pricierResult = await simulator.run(pricierKeyword);
    expect(cheaperResult.estimatedRoas).not.toBeCloseTo(pricierResult.estimatedRoas, 2);
  });
});

// ── Evidence-based tolerance + bid accuracy ───────────────────────────────

describe("bid accuracy (evidence-based tolerance)", () => {
  it("high confidence (>=30 clicks, >=3 orders) uses +/-10% tolerance", async () => {
    const kw = baselineKeyword({ evidenceClicks: 30, evidenceOrders: 3 });
    // A tiny minimumBidIncrement so the 5x-increment absolute floor doesn't
    // swamp the percentage-based band at this keyword's bid magnitude.
    const input = baselineScenario({ minimumBidIncrement: 0.001 }, [kw]);
    const base = await simulator.run(input);
    const gt = base.bids[0]!.groundTruth;
    expect(base.bids[0]!.confidence).toBe("high");

    const within = await simulator.run({ ...input, userBidAdjustments: { kw1: gt * 1.09 } });
    expect(within.bids[0]!.isCorrect).toBe(true);

    const outside = await simulator.run({ ...input, userBidAdjustments: { kw1: gt * 1.25 } });
    expect(outside.bids[0]!.isCorrect).toBe(false);
  });

  it("low confidence (below both thresholds) uses +/-20% tolerance", async () => {
    const kw = baselineKeyword({ evidenceClicks: 5, evidenceOrders: 0 });
    const input = baselineScenario({}, [kw]);
    const base = await simulator.run(input);
    const gt = base.bids[0]!.groundTruth;
    expect(base.bids[0]!.confidence).toBe("low");

    const within = await simulator.run({ ...input, userBidAdjustments: { kw1: gt * 1.19 } });
    expect(within.bids[0]!.isCorrect).toBe(true);

    const outside = await simulator.run({ ...input, userBidAdjustments: { kw1: gt * 1.3 } });
    expect(outside.bids[0]!.isCorrect).toBe(false);
  });

  it("the 5x minimum-bid-increment floor applies for very small recommended bids", async () => {
    // A near-zero recommended bid: percentage tolerance would be tiny,
    // but the absolute floor (5 * 0.05 = 0.25) must still apply.
    const kw = baselineKeyword({ baselineCvrPct: 0.5 }); // small ceiling -> small recommended bid
    const input = baselineScenario({ minimumBidIncrement: 0.05 }, [kw]);
    const base = await simulator.run(input);
    const gt = base.bids[0]!.groundTruth;
    const result = await simulator.run({ ...input, userBidAdjustments: { kw1: gt + 0.2 } });
    expect(result.bids[0]!.isCorrect).toBe(true); // within the 0.25 floor
  });

  it("bidAccuracy = 100 when all reviewed keywords are correct", async () => {
    const input = baselineScenario();
    const base = await simulator.run(input);
    const gt = base.bids[0]!.groundTruth;
    const result = await simulator.run({ ...input, userBidAdjustments: { kw1: gt } });
    expect(result.scoreDimensions!.bidAccuracy).toBe(100);
  });

  it("bidAccuracy = 0 when no reviewed keywords are correct", async () => {
    const input = baselineScenario();
    const result = await simulator.run({ ...input, userBidAdjustments: { kw1: 999 } });
    expect(result.scoreDimensions!.bidAccuracy).toBe(0);
  });

  it("bidAccuracy = 50 when half of reviewed keywords are correct", async () => {
    const kw2 = baselineKeyword({ keywordId: "kw2", keyword: "boots" });
    const input = baselineScenario({}, [baselineKeyword(), kw2]);
    const base = await simulator.run(input);
    const gt1 = base.bids.find((b) => b.keywordId === "kw1")!.groundTruth;
    const result = await simulator.run({
      ...input,
      userBidAdjustments: { kw1: gt1, kw2: 999 },
    });
    expect(result.scoreDimensions!.bidAccuracy).toBe(50);
  });
});

// ── Outcome grading (full / partial / capped) ─────────────────────────────

describe("outcome grading", () => {
  it("full credit when target ROAS is met and capture is >=90% of best feasible sales", async () => {
    const input = baselineScenario();
    const base = await simulator.run(input);
    const gt = base.bids[0]!.groundTruth;
    const result = await simulator.run({ ...input, userBidAdjustments: { kw1: gt } });
    expect(result.scoreDimensions!.roasHit).toBe(100);
  });

  it("caps below full credit for a safe but overly conservative bid", async () => {
    const input = baselineScenario();
    // A low bid: safe (won't blow ROAS) but captures far less than the best feasible sales.
    const result = await simulator.run({ ...input, userBidAdjustments: { kw1: 0.05 } });
    expect(result.scoreDimensions!.roasHit).toBeLessThan(100);
    expect(result.scoreDimensions!.roasHit).toBeLessThanOrEqual(89);
  });

  it("caps the score when a bid exceeds its economic ceiling", async () => {
    const input = baselineScenario();
    const ceiling = (await simulator.run(input)).bids[0]!.economicCeiling;
    const result = await simulator.run({
      ...input,
      userBidAdjustments: { kw1: ceiling + 1 },
    });
    expect(result.scoreDimensions!.roasHit).toBeLessThanOrEqual(40);
  });
});

// ── Budget adherence ───────────────────────────────────────────────────────

describe("budget adherence", () => {
  it("is 100 when the user's bids don't need pacing to stay within budget", async () => {
    const input = baselineScenario({ dailyBudget: 100000 });
    const base = await simulator.run(input);
    const gt = base.bids[0]!.groundTruth;
    const result = await simulator.run({ ...input, userBidAdjustments: { kw1: gt } });
    expect(result.scoreDimensions!.budgetAdherence).toBe(100);
  });

  it("scales down when the user's bids would overspend the budget", async () => {
    const input = baselineScenario({ dailyBudget: 1 });
    const result = await simulator.run({ ...input, userBidAdjustments: { kw1: 0.9 } });
    expect(result.scoreDimensions!.budgetAdherence).toBeLessThan(100);
    expect(result.scoreDimensions!.budgetAdherence).toBeGreaterThan(0);
  });
});

// ── Ordering, determinism, shape ───────────────────────────────────────────

describe("ordering and determinism", () => {
  it("orders bids by available impression volume descending", async () => {
    const low = baselineKeyword({
      keywordId: "low",
      keyword: "low volume",
      availableImpressionsPerDay: 100,
    });
    const high = baselineKeyword({
      keywordId: "high",
      keyword: "high volume",
      availableImpressionsPerDay: 5000,
    });
    const mid = baselineKeyword({
      keywordId: "mid",
      keyword: "mid volume",
      availableImpressionsPerDay: 1000,
    });
    const input = baselineScenario({}, [low, high, mid]);
    const result = await simulator.run(input);
    expect(result.bids.map((b) => b.keywordId)).toEqual(["high", "mid", "low"]);
  });

  it("produces identical output for identical input (deterministic replay)", async () => {
    const input = baselineScenario({}, [
      baselineKeyword(),
      baselineKeyword({ keywordId: "kw2", keyword: "boots" }),
    ]);
    const withBids = { ...input, userBidAdjustments: { kw1: 0.6, kw2: 0.4 } };
    const first = await simulator.run(withBids);
    const second = await simulator.run(withBids);
    expect(second).toEqual(first);
  });

  it("preview mode (no userBidAdjustments) returns score 100 and null dimensions", async () => {
    const input = baselineScenario();
    const result = await simulator.run(input);
    expect(result.score).toBe(100);
    expect(result.scoreDimensions).toBeNull();
    expect(result.bids[0]!.userBid).toBeUndefined();
    expect(result.bids[0]!.isCorrect).toBeUndefined();
  });

  it("score equals bidAccuracy when grading", async () => {
    const input = baselineScenario();
    const result = await simulator.run({ ...input, userBidAdjustments: { kw1: 999 } });
    expect(result.score).toBe(result.scoreDimensions!.bidAccuracy);
    expect(result.score).toBe(0);
  });
});
