import { describe, it, expect } from "vitest";
import {
  AOV,
  REF_BID,
  SEARCH_TERM_ROWS,
  clamp,
  lerp,
  niceStep,
  formatInt,
  formatUsd,
  ownAcos,
  computeBidElevator,
  type TermState,
} from "../bidElevator.logic";

function allAuto(): Record<string, TermState> {
  return Object.fromEntries(SEARCH_TERM_ROWS.map((r) => [r.id, "auto" as TermState]));
}

describe("clamp", () => {
  it("passes values inside the range through unchanged", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps below the minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps above the maximum", () => {
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("lerp", () => {
  it("interpolates halfway at t=0.5", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it("returns the start value at t=0", () => {
    expect(lerp(3, 9, 0)).toBe(3);
  });

  it("returns the end value at t=1", () => {
    expect(lerp(3, 9, 1)).toBe(9);
  });
});

describe("niceStep", () => {
  it("returns 10 for non-positive input", () => {
    expect(niceStep(0)).toBe(10);
    expect(niceStep(-4)).toBe(10);
  });

  it("rounds up to the nearest 1/2/5/10 step", () => {
    expect(niceStep(3)).toBe(5);
    expect(niceStep(12)).toBe(20);
    expect(niceStep(45)).toBe(50);
    expect(niceStep(88)).toBe(100);
  });
});

describe("formatInt / formatUsd", () => {
  it("rounds and groups thousands", () => {
    expect(formatInt(48210.4)).toBe("48,210");
    expect(formatUsd(1234.6)).toBe("$1,235");
  });
});

describe("ownAcos", () => {
  it("computes cpc / (cvr * AOV) as a percentage", () => {
    const row = SEARCH_TERM_ROWS[0]!;
    const expected = (row.cpc / (row.cvr * AOV)) * 100;
    expect(ownAcos(row)).toBeCloseTo(expected, 6);
  });
});

describe("computeBidElevator", () => {
  it("scales spend down to stay within budget when raw demand exceeds it", () => {
    const result = computeBidElevator(SEARCH_TERM_ROWS, allAuto(), 20, REF_BID, 30);
    expect(result.spend).toBeLessThanOrEqual(20 + 1e-6);
  });

  it("does not cap spend when the budget comfortably covers demand", () => {
    const uncapped = computeBidElevator(SEARCH_TERM_ROWS, allAuto(), 5000, REF_BID, 30);
    const rawSpendAtRefBid = SEARCH_TERM_ROWS.reduce((sum, r) => sum + r.clk * r.cpc, 0);
    expect(uncapped.spend).toBeCloseTo(rawSpendAtRefBid, 5);
  });

  it("excludes negated rows entirely from spend, sales, and the per-row view", () => {
    const states = allAuto();
    states.r1 = "neg";
    const result = computeBidElevator(SEARCH_TERM_ROWS, states, 5000, REF_BID, 30);
    expect(result.view.find((v) => v.id === "r1")).toBeUndefined();
    expect(result.view).toHaveLength(SEARCH_TERM_ROWS.length - 1);
  });

  it("boosts conversion rate for exact-matched rows, raising their sales", () => {
    const auto = computeBidElevator(SEARCH_TERM_ROWS, allAuto(), 5000, REF_BID, 30);
    const states = allAuto();
    states.r1 = "exact";
    const exact = computeBidElevator(SEARCH_TERM_ROWS, states, 5000, REF_BID, 30);
    const autoR1 = auto.view.find((v) => v.id === "r1")!;
    const exactR1 = exact.view.find((v) => v.id === "r1")!;
    expect(exactR1.sales).toBeCloseTo(autoR1.sales * 1.25, 5);
  });

  it("returns a null aggregate ACoS and an empty view when every row is negated", () => {
    const states: Record<string, TermState> = Object.fromEntries(
      SEARCH_TERM_ROWS.map((r) => [r.id, "neg" as TermState]),
    );
    const result = computeBidElevator(SEARCH_TERM_ROWS, states, 120, REF_BID, 30);
    expect(result.view).toHaveLength(0);
    expect(result.acos).toBeNull();
    expect(result.spend).toBe(0);
  });

  it("sets breakEven to 0 for every row when the target ACoS is 0", () => {
    const result = computeBidElevator(SEARCH_TERM_ROWS, allAuto(), 120, REF_BID, 0);
    expect(result.view.every((v) => v.breakEven === 0)).toBe(true);
  });

  it("raises bid multiplier — and therefore impressions/clicks — as the bid slider increases", () => {
    const low = computeBidElevator(SEARCH_TERM_ROWS, allAuto(), 5000, 0.3, 30);
    const high = computeBidElevator(SEARCH_TERM_ROWS, allAuto(), 5000, 2.0, 30);
    expect(high.imp).toBeGreaterThan(low.imp);
    expect(high.clk).toBeGreaterThan(low.clk);
  });
});
