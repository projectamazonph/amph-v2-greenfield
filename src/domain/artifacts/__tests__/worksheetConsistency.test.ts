/**
 * worksheetConsistency.test.ts — TDD (red first).
 *
 * STORY-164: the Lesson 1.5 read view checks that the rows the
 * learner wrote in Lessons 1.1-1.5 actually agree. Three checks:
 *
 *   1. maxCpc (1.2) ≈ maxCpcRecap (1.5).  The lesson teaches the
 *      max-CPC formula in 1.2 and recaps it in 1.5. A learner who
 *      types different numbers in the two fields has either
 *      forgotten or typed wrong.
 *   2. breakEvenAcos (1.3) ≈ profitMarginBeforeAds (1.3).  These
 *      are the same number expressed two ways.
 *   3. minimumRoas (1.4) ≈ 1 / profitMarginBeforeAds (1.3).  The
 *      minimum ROAS a product can sustain is the reciprocal of its
 *      profit margin.
 *
 * Each check returns a status of "ok" or "drift" with a short
 * reason the renderer can show inline. A 1% tolerance covers
 * rounding from typing a margin as 0.40 vs 0.400.
 */

import { describe, it, expect } from "vitest";
import {
  computeWorksheetConsistency,
  type Module1RowSnapshot,
} from "../worksheetConsistency";

function rows(overrides: Partial<Module1RowSnapshot> = {}): Module1RowSnapshot {
  return {
    weeklyImpressions: "",
    weeklyClicks: "",
    weeklyAdSpend: "",
    weeklyAdSales: "",
    weeklyTotalSales: "",
    productCvr: "",
    targetAcos: "",
    maxCpc: "",
    weeklyActualAcos: "",
    profitMarginBeforeAds: "",
    weeklyTacos: "",
    breakEvenAcos: "",
    productProfitMargin: "",
    minimumRoas: "",
    maxCpcRecap: "",
    ...overrides,
  };
}

describe("computeWorksheetConsistency", () => {
  it("returns 'unknown' for every check when every field is empty (no data yet)", () => {
    const result = computeWorksheetConsistency(rows());
    // Empty inputs are not a "drift" — they are an absence of data
    // the learner has not filled in yet. "drift" is reserved for
    // values that disagree with each other.
    expect(result.maxCpcRecap.status).toBe("unknown");
    expect(result.breakEvenAcos.status).toBe("unknown");
    expect(result.minimumRoas.status).toBe("unknown");
  });

  it("returns 'ok' for maxCpc recap when the two fields match", () => {
    const result = computeWorksheetConsistency(
      rows({ maxCpc: "1.20", maxCpcRecap: "1.20" }),
    );
    expect(result.maxCpcRecap.status).toBe("ok");
    expect(result.maxCpcRecap.drift).toBeUndefined();
  });

  it("returns 'drift' for maxCpc recap when the two fields differ", () => {
    const result = computeWorksheetConsistency(
      rows({ maxCpc: "1.20", maxCpcRecap: "0.95" }),
    );
    expect(result.maxCpcRecap.status).toBe("drift");
    expect(result.maxCpcRecap.drift).toBeGreaterThan(0);
  });

  it("treats a 1% drift as still ok (rounding tolerance)", () => {
    const result = computeWorksheetConsistency(
      rows({ maxCpc: "1.00", maxCpcRecap: "1.01" }),
    );
    expect(result.maxCpcRecap.status).toBe("ok");
  });

  it("returns 'ok' for breakEvenAcos when margin and break-even are the same", () => {
    const result = computeWorksheetConsistency(
      rows({ profitMarginBeforeAds: "0.40", breakEvenAcos: "0.40" }),
    );
    expect(result.breakEvenAcos.status).toBe("ok");
  });

  it("returns 'drift' for breakEvenAcos when the two fields differ", () => {
    const result = computeWorksheetConsistency(
      rows({ profitMarginBeforeAds: "0.40", breakEvenAcos: "0.30" }),
    );
    expect(result.breakEvenAcos.status).toBe("drift");
  });

  it("returns 'ok' for minimumRoas when 1/margin matches the typed minimum", () => {
    // 1 / 0.40 = 2.50
    const result = computeWorksheetConsistency(
      rows({ profitMarginBeforeAds: "0.40", minimumRoas: "2.50" }),
    );
    expect(result.minimumRoas.status).toBe("ok");
  });

  it("returns 'drift' for minimumRoas when the reciprocal does not match", () => {
    const result = computeWorksheetConsistency(
      rows({ profitMarginBeforeAds: "0.40", minimumRoas: "3.00" }),
    );
    expect(result.minimumRoas.status).toBe("drift");
  });

  it("skips checks when one side of the comparison is empty (no false drift)", () => {
    const result = computeWorksheetConsistency(
      rows({ profitMarginBeforeAds: "0.40" /* minimumRoas is "" */ }),
    );
    // minimumRoas side is empty, so the check is "unknown" not "drift"
    expect(result.minimumRoas.status).not.toBe("drift");
  });

  it("parses values with currency symbols and commas (₱, $, commas)", () => {
    const result = computeWorksheetConsistency(
      rows({ maxCpc: "₱1.20", maxCpcRecap: "1.20" }),
    );
    expect(result.maxCpcRecap.status).toBe("ok");
  });
});
