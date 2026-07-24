/**
 * BidElevatorSimulator tests.
 *
 * STORY-068: Bid Elevator Rebuild (Scoring Engine Integration).
 *
 * Test groups:
 *  1. Edge cases (empty keywords, zero budget, zero volume)
 *  2. Ground truth — no userBidAdjustments → score=100, scoreDimensions=null
 *  3. Bid accuracy — isCorrect when user bids are / are not within ±20%
 *  4. Dimension scoring (bidAccuracy, budgetAdherence, roasHit, explanation)
 *  5. Overall score = bidAccuracy when grading
 *  6. Bid sort order (volume descending)
 *  7. Backward compat — score is 100 in preview mode
 */

import { describe, it, expect } from "vitest";
import { BidElevatorSimulator } from "@/domain/simulator/bid-elevator/BidElevatorSimulator";
import type { BidElevatorInput } from "@/domain/simulator/bid-elevator/BidElevatorInput";

const simulator = new BidElevatorSimulator();

// ── Edge cases ────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("returns empty result when keywords array is empty", async () => {
    const input: BidElevatorInput = {
      keywords: [],
      budget: 100,
      targetRoas: 3.0,
    };
    const result = await simulator.run(input);
    expect(result.bids).toHaveLength(0);
    expect(result.estimatedSpend).toBe(0);
    expect(result.estimatedRoas).toBe(0);
    expect(result.score).toBe(0);
    expect(result.scoreDimensions).toBeNull();
  });

  it("returns empty result when budget is zero", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "running shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 0,
      targetRoas: 3.0,
    };
    const result = await simulator.run(input);
    expect(result.bids).toHaveLength(0);
    expect(result.estimatedSpend).toBe(0);
    expect(result.score).toBe(0);
    expect(result.scoreDimensions).toBeNull();
  });

  it("returns empty result when all keywords have zero volume", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "niche", currentBid: 1.0, currentCpc: 0.8, volume: 0 }],
      budget: 50,
      targetRoas: 3.0,
    };
    const result = await simulator.run(input);
    expect(result.bids).toHaveLength(0);
    expect(result.estimatedSpend).toBe(0);
    expect(result.score).toBe(0);
  });
});

// ── Ground truth (no userBidAdjustments) ─────────────────────────────────

describe("ground truth (no userBidAdjustments)", () => {
  it("returns suggested bids with groundTruth set, scoreDimensions null, score 100", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "running shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 100,
      targetRoas: 3.0,
    };
    const result = await simulator.run(input);
    expect(result.bids).toHaveLength(1);
    expect(result.bids[0]!.groundTruth).toBeGreaterThan(0);
    expect(result.bids[0]!.userBid).toBeUndefined();
    expect(result.bids[0]!.isCorrect).toBeUndefined();
    expect(result.scoreDimensions).toBeNull();
    expect(result.score).toBe(100); // preview mode
  });

  it("groundTruth is capped at 2× currentBid", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "running shoes", currentBid: 1.0, currentCpc: 0.8, volume: 10000 }],
      budget: 1000, // huge budget → would produce a very high suggested bid
      targetRoas: 3.0,
    };
    const result = await simulator.run(input);
    // Suggested bid should not exceed 2× currentBid = 2.0
    expect(result.bids[0]!.groundTruth).toBeLessThanOrEqual(2.0);
  });

  it("estimatedRoas equals targetRoas by construction of the algorithm", async () => {
    const input: BidElevatorInput = {
      keywords: [
        { keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 500 },
        { keyword: "boots", currentBid: 2.0, currentCpc: 1.5, volume: 300 },
      ],
      budget: 50,
      targetRoas: 3.5,
    };
    const result = await simulator.run(input);
    expect(result.estimatedRoas).toBeCloseTo(3.5);
  });

  it("bids are sorted by volume descending", async () => {
    const input: BidElevatorInput = {
      keywords: [
        { keyword: "low volume", currentBid: 0.5, currentCpc: 0.4, volume: 100 },
        { keyword: "high volume", currentBid: 0.5, currentCpc: 0.4, volume: 5000 },
        { keyword: "mid volume", currentBid: 0.5, currentCpc: 0.4, volume: 1000 },
      ],
      budget: 50,
      targetRoas: 3.0,
    };
    const result = await simulator.run(input);
    expect(result.bids[0]!.keyword).toBe("high volume");
    expect(result.bids[1]!.keyword).toBe("mid volume");
    expect(result.bids[2]!.keyword).toBe("low volume");
  });

  it("groundTruth is always set regardless of userBidAdjustments", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
      userBidAdjustments: { shoes: 0.8 },
    };
    const result = await simulator.run(input);
    expect(result.bids[0]!.groundTruth).toBeGreaterThan(0);
  });
});

// ── Bid accuracy (isCorrect) ─────────────────────────────────────────────

describe("bid accuracy (isCorrect)", () => {
  const kw = { keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 };

  it("isCorrect is true when user bid equals ground truth", async () => {
    const baseInput: BidElevatorInput = {
      keywords: [kw],
      budget: 50,
      targetRoas: 3.0,
    };
    const base = await simulator.run(baseInput);
    const groundTruth = base.bids[0]!.groundTruth;
    const result = await simulator.run({
      ...baseInput,
      userBidAdjustments: { shoes: groundTruth },
    });
    expect(result.bids[0]!.userBid).toBe(groundTruth);
    expect(result.bids[0]!.isCorrect).toBe(true);
  });

  it("isCorrect is true when user bid is within ±20% of ground truth", async () => {
    const baseInput: BidElevatorInput = { keywords: [kw], budget: 50, targetRoas: 3.0 };
    const base = await simulator.run(baseInput);
    const gt = base.bids[0]!.groundTruth;
    // 10% below ground truth
    const result = await simulator.run({ ...baseInput, userBidAdjustments: { shoes: gt * 0.9 } });
    expect(result.bids[0]!.isCorrect).toBe(true);
    // 20% above ground truth
    const result2 = await simulator.run({ ...baseInput, userBidAdjustments: { shoes: gt * 1.2 } });
    expect(result2.bids[0]!.isCorrect).toBe(true);
  });

  it("isCorrect is false when user bid is outside ±20% of ground truth", async () => {
    const baseInput: BidElevatorInput = { keywords: [kw], budget: 50, targetRoas: 3.0 };
    const base = await simulator.run(baseInput);
    const gt = base.bids[0]!.groundTruth;
    // 25% above ground truth
    const result = await simulator.run({ ...baseInput, userBidAdjustments: { shoes: gt * 1.25 } });
    expect(result.bids[0]!.isCorrect).toBe(false);
  });

  it("isCorrect is undefined when userBidAdjustments is not provided", async () => {
    const input: BidElevatorInput = { keywords: [kw], budget: 50, targetRoas: 3.0 };
    const result = await simulator.run(input);
    expect(result.bids[0]!.isCorrect).toBeUndefined();
    expect(result.bids[0]!.userBid).toBeUndefined();
  });

  it("isCorrect is undefined for keywords not in userBidAdjustments", async () => {
    const input: BidElevatorInput = {
      keywords: [kw],
      budget: 50,
      targetRoas: 3.0,
      userBidAdjustments: {}, // empty — no keywords graded
    };
    const result = await simulator.run(input);
    expect(result.bids[0]!.isCorrect).toBeUndefined();
    expect(result.bids[0]!.userBid).toBeUndefined();
  });

  it("zero ground truth is treated as always correct", async () => {
    // A keyword with enough volume to get a zero ground truth (unlikely but tested)
    const zeroGtInput: BidElevatorInput = {
      keywords: [{ keyword: "z", currentBid: 0, currentCpc: 0, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
    };
    const base = await simulator.run(zeroGtInput);
    // If ground truth comes out zero, any user bid should be correct
    if (base.bids[0]!.groundTruth === 0) {
      const result = await simulator.run({
        ...zeroGtInput,
        userBidAdjustments: { z: 999 },
      });
      expect(result.bids[0]!.isCorrect).toBe(true);
    }
  });
});

// ── Dimension scoring ─────────────────────────────────────────────────────

describe("dimension scoring (userBidAdjustments provided)", () => {
  it("scoreDimensions is not null when userBidAdjustments provided", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
      userBidAdjustments: { shoes: 1.0 },
    };
    const result = await simulator.run(input);
    expect(result.scoreDimensions).not.toBeNull();
  });

  it("bidAccuracy = 100 when all reviewed keywords are correct", async () => {
    const baseInput: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
    };
    const base = await simulator.run(baseInput);
    const gt = base.bids[0]!.groundTruth;
    const result = await simulator.run({
      ...baseInput,
      userBidAdjustments: { shoes: gt },
    });
    expect(result.scoreDimensions!.bidAccuracy).toBe(100);
  });

  it("bidAccuracy = 0 when no reviewed keywords are correct", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
      userBidAdjustments: { shoes: 999 }, // way off
    };
    const result = await simulator.run(input);
    expect(result.scoreDimensions!.bidAccuracy).toBe(0);
  });

  it("bidAccuracy = 50 when half of reviewed keywords are correct", async () => {
    const baseInput: BidElevatorInput = {
      keywords: [
        { keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 },
        { keyword: "boots", currentBid: 1.0, currentCpc: 0.8, volume: 1000 },
      ],
      budget: 50,
      targetRoas: 3.0,
    };
    const base = await simulator.run(baseInput);
    const gt1 = base.bids[0]!.groundTruth;
    const gt2 = base.bids[1]!.groundTruth;
    const result = await simulator.run({
      ...baseInput,
      userBidAdjustments: { shoes: gt1, boots: 999 }, // one correct, one wrong
    });
    expect(result.scoreDimensions!.bidAccuracy).toBe(50);
  });

  it("budgetAdherence = 100 when user spend equals or is under budget", async () => {
    // User bids at ground truth produce spend = estimatedSpend
    // Since ground truth is budget-optimized, spend should be at or under budget
    const input: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 100,
      targetRoas: 3.0,
      userBidAdjustments: { shoes: 0.5 }, // very low bid
    };
    const result = await simulator.run(input);
    expect(result.scoreDimensions!.budgetAdherence).toBe(100);
  });

  it("budgetAdherence scales down when user spend exceeds budget", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 10, // tight budget
      targetRoas: 3.0,
      userBidAdjustments: { shoes: 10.0 }, // way over ground truth
    };
    const result = await simulator.run(input);
    // spend >> budget, so budgetAdherence < 100
    expect(result.scoreDimensions!.budgetAdherence).toBeLessThan(100);
    expect(result.scoreDimensions!.budgetAdherence).toBeGreaterThan(0);
  });

  it("roasHit = 100 when userSpend > 0 (revenue model preserves target ROAS)", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
      userBidAdjustments: { shoes: 1.0 },
    };
    const result = await simulator.run(input);
    expect(result.scoreDimensions!.roasHit).toBe(100);
  });

  it("explanation = 100 (placeholder)", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
      userBidAdjustments: { shoes: 1.0 },
    };
    const result = await simulator.run(input);
    expect(result.scoreDimensions!.explanation).toBe(100);
  });
});

// ── Overall score ─────────────────────────────────────────────────────────

describe("overall score", () => {
  it("score equals bidAccuracy when grading (userBidAdjustments provided)", async () => {
    const input: BidElevatorInput = {
      keywords: [
        { keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 },
        { keyword: "boots", currentBid: 1.0, currentCpc: 0.8, volume: 1000 },
      ],
      budget: 50,
      targetRoas: 3.0,
      userBidAdjustments: { shoes: 999, boots: 999 }, // both wrong
    };
    const result = await simulator.run(input);
    expect(result.score).toBe(result.scoreDimensions!.bidAccuracy);
    expect(result.score).toBe(0);
  });

  it("score = 100 when preview mode (no userBidAdjustments)", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
    };
    const result = await simulator.run(input);
    expect(result.score).toBe(100);
    expect(result.scoreDimensions).toBeNull();
  });
});

// ── Backward compatibility ────────────────────────────────────────────────

describe("backward compatibility", () => {
  it("run without userBidAdjustments produces the same bids array shape as before", async () => {
    const input: BidElevatorInput = {
      keywords: [
        { keyword: "running shoes", currentBid: 0.5, currentCpc: 0.45, volume: 1000 },
        { keyword: "running shoes women", currentBid: 0.6, currentCpc: 0.55, volume: 800 },
      ],
      budget: 50,
      targetRoas: 3.0,
    };
    const result = await simulator.run(input);
    expect(result.bids).toHaveLength(2);
    expect(result.bids[0]!.keyword).toBeDefined();
    expect(result.bids[0]!.groundTruth).toBeGreaterThan(0);
    expect(result.bids[0]!.currentBid).toBe(0.5);
    expect(result.bids[0]!.estimatedCpc).toBe(0.45);
    expect(result.bids[0]!.volume).toBe(1000);
  });
});
