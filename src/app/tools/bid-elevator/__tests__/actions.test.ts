/**
 * runBidElevator — server action contract tests.
 *
 * The action runs the real BidElevatorSimulator against the
 * registered one in the test container.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { runBidElevator } from "../actions";

const VALID_KEYWORDS = [
  { keyword: "earbuds", currentBid: 1.0, currentCpc: 0.50, volume: 1000 },
  { keyword: "headphones", currentBid: 1.5, currentCpc: 0.80, volume: 800 },
];

describe("runBidElevator", () => {
  it("returns invalid_input when keywords is empty", async () => {
    const result = await runBidElevator({
      keywords: [],
      budget: 100,
      targetRoas: 4,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input when budget is 0", async () => {
    const result = await runBidElevator({
      keywords: VALID_KEYWORDS,
      budget: 0,
      targetRoas: 4,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input when a keyword has a negative bid", async () => {
    const result = await runBidElevator({
      keywords: [{ ...VALID_KEYWORDS[0]!, currentBid: -1 }],
      budget: 100,
      targetRoas: 4,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns a score in 0-100 for valid input", async () => {
    const result = await runBidElevator({
      keywords: VALID_KEYWORDS,
      budget: 100,
      targetRoas: 4,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBeGreaterThanOrEqual(0);
    expect(result.value.score).toBeLessThanOrEqual(100);
  });

  it("returns per-keyword recommendations matching input keywords", async () => {
    const result = await runBidElevator({
      keywords: VALID_KEYWORDS,
      budget: 100,
      targetRoas: 4,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const keywords = result.value.bids.map((b) => b.keyword).sort();
    expect(keywords).toEqual(["earbuds", "headphones"]);
  });
});
