/**
 * BidElevatorSimulator tests — TDD (red first).
 *
 * STORY-037: Bid Elevator simulator.
 */

import { describe, it, expect } from "vitest";
import { BidElevatorSimulator } from "@/domain/simulator/bid-elevator/BidElevatorSimulator";
import type { BidElevatorInput } from "@/domain/simulator/bid-elevator/BidElevatorInput";

describe("BidElevatorSimulator", () => {
  const simulator = new BidElevatorSimulator();

  it("returns a result with bids, estimatedSpend, estimatedRoas, and score", async () => {
    const input: BidElevatorInput = {
      keywords: [
        { keyword: "running shoes men", currentBid: 0.5, currentCpc: 0.45, volume: 1000 },
        { keyword: "running shoes women", currentBid: 0.6, currentCpc: 0.55, volume: 800 },
      ],
      budget: 50,
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    expect(result.bids).toHaveLength(2);
    expect(result.estimatedSpend).toBeGreaterThan(0);
    expect(result.estimatedRoas).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("sets score to 100 when estimated ROAS meets or exceeds target", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "running shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 100,
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    // If we can hit the ROAS target, score should be 100
    expect(result.score).toBe(100);
  });

  it("handles zero budget without throwing", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "test", currentBid: 0.5, currentCpc: 0.45, volume: 100 }],
      budget: 0,
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    expect(result.estimatedSpend).toBe(0);
    expect(result.score).toBe(0);
  });

  it("handles keywords with zero total volume without throwing", async () => {
    const input: BidElevatorInput = {
      keywords: [{ keyword: "niche product", currentBid: 1.0, currentCpc: 0.9, volume: 0 }],
      budget: 50,
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    // Zero total volume → empty result
    expect(result.estimatedSpend).toBe(0);
    expect(result.bids).toHaveLength(0);
    expect(result.score).toBe(0);
  });

  it("raises score when spend is within budget and ROAS is high", async () => {
    const input: BidElevatorInput = {
      keywords: [
        { keyword: "running shoes", currentBid: 0.5, currentCpc: 0.4, volume: 500 },
        { keyword: "jogging shoes", currentBid: 0.3, currentCpc: 0.25, volume: 300 },
      ],
      budget: 50,
      targetRoas: 4.0,
    };

    const result = await simulator.run(input);

    expect(result.score).toBeGreaterThan(0);
    expect(result.estimatedSpend).toBeLessThanOrEqual(input.budget * 1.1);
  });
});
