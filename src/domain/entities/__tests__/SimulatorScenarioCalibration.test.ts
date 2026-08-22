/**
 * SimulatorScenarioCalibration — domain unit tests
 *
 * STORY-086 acceptance criteria:
 *  - Calibration bands must be tighter than [0, 100] (not wider)
 *  - mergeCalibrationIntoScores clamps out-of-band scores; bands absent
 *    for a dimension leave its raw score untouched
 *  - Invalid bands (inverted, full range, non-finite) are rejected by
 *    the factory
 *  - Unknown dimension names are rejected
 */

import { describe, expect, it } from "vitest";
import {
  createSimulatorScenarioCalibration,
  mergeCalibrationIntoScores,
  isValidCalibrationBand,
  type CalibrationDimensionBand,
  type CreateSimulatorScenarioCalibrationParams,
} from "../SimulatorScenarioCalibration";
import { Result } from "@/domain/shared/Result";

const BASE_PARAMS: CreateSimulatorScenarioCalibrationParams = {
  id: "cal-001",
  simulatorId: "bid-elevator",
  scenarioKey: "bid-elevator-scenario-1",
  dimensionBands: {
    bidAccuracy: { minScore: 60, maxScore: 95 },
    budgetAdherence: { minScore: 70, maxScore: 90 },
  },
  instructorId: "instr-001",
  createdAt: new Date("2026-08-21T00:00:00Z"),
};

// ── Factory ────────────────────────────────────────────────────────────────

describe("createSimulatorScenarioCalibration factory", () => {
  it("accepts a tight band and returns a calibration entity", () => {
    const result = createSimulatorScenarioCalibration(BASE_PARAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.id).toBe("cal-001");
    expect(result.value.simulatorId).toBe("bid-elevator");
    expect(result.value.scenarioKey).toBe("bid-elevator-scenario-1");
    expect(result.value.dimensionBands.bidAccuracy).toEqual({ minScore: 60, maxScore: 95 });
    expect(result.value.instructorId).toBe("instr-001");
  });

  it("trims whitespace around scenarioKey and instructorId", () => {
    const result = createSimulatorScenarioCalibration({
      ...BASE_PARAMS,
      scenarioKey: "  bid-elevator-scenario-1  ",
      instructorId: "  instr-001  ",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scenarioKey).toBe("bid-elevator-scenario-1");
    expect(result.value.instructorId).toBe("instr-001");
  });

  it("allows empty dimensionBands (no-op calibration)", () => {
    const result = createSimulatorScenarioCalibration({
      ...BASE_PARAMS,
      dimensionBands: {},
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dimensionBands).toEqual({});
  });

  it("rejects an empty scenarioKey", () => {
    const result = createSimulatorScenarioCalibration({
      ...BASE_PARAMS,
      scenarioKey: "   ",
    });
    expect(result.ok).toBe(false);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("invalid_scenario_key");
    }
  });

  it("rejects an empty instructorId", () => {
    const result = createSimulatorScenarioCalibration({
      ...BASE_PARAMS,
      instructorId: "",
    });
    expect(result.ok).toBe(false);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("invalid_scenario_key");
    }
  });

  it("rejects an unknown dimension name", () => {
    const result = createSimulatorScenarioCalibration({
      ...BASE_PARAMS,
      dimensionBands: {
        bidAccuracy: { minScore: 60, maxScore: 95 },
        madeUpDimension: { minScore: 50, maxScore: 90 },
      },
    });
    expect(result.ok).toBe(false);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("unknown_dimension");
      if (result.error.kind === "unknown_dimension") {
        expect(result.error.dimension).toBe("madeUpDimension");
      }
    }
  });
});

// ── Band validation ────────────────────────────────────────────────────────

describe("band validation", () => {
  it("accepts a strict-subset band [60, 95]", () => {
    expect(isValidCalibrationBand({ minScore: 60, maxScore: 95 })).toBe(true);
  });

  it("accepts a band [1, 100] (max - min < 100)", () => {
    // The bound is `max - min < 100`, not `max < 100`.
    expect(isValidCalibrationBand({ minScore: 1, maxScore: 100 })).toBe(true);
  });

  it("rejects the full [0, 100] band", () => {
    // This is the canonical "we'll mark everything fix" failure mode.
    expect(isValidCalibrationBand({ minScore: 0, maxScore: 100 })).toBe(false);
  });

  it("rejects an inverted band (minScore > maxScore)", () => {
    expect(isValidCalibrationBand({ minScore: 80, maxScore: 60 })).toBe(false);
  });

  it("rejects a degenerate band (minScore == maxScore)", () => {
    expect(isValidCalibrationBand({ minScore: 75, maxScore: 75 })).toBe(false);
  });

  it("rejects minScore below 0", () => {
    expect(isValidCalibrationBand({ minScore: -1, maxScore: 50 })).toBe(false);
  });

  it("rejects maxScore above 100", () => {
    expect(isValidCalibrationBand({ minScore: 50, maxScore: 101 })).toBe(false);
  });

  it("rejects non-finite bounds (NaN)", () => {
    expect(isValidCalibrationBand({ minScore: Number.NaN, maxScore: 80 })).toBe(false);
    expect(isValidCalibrationBand({ minScore: 50, maxScore: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it("factory surfaces invalid_band for the full [0,100] band under the right dimension", () => {
    const band: CalibrationDimensionBand = { minScore: 0, maxScore: 100 };
    const result = createSimulatorScenarioCalibration({
      ...BASE_PARAMS,
      dimensionBands: { bidAccuracy: band },
    });
    expect(result.ok).toBe(false);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("invalid_band");
      if (result.error.kind === "invalid_band") {
        expect(result.error.dimension).toBe("bidAccuracy");
        expect(result.error.reason).toMatch(/full numeric range/i);
      }
    }
  });
});

// ── Merge rule ────────────────────────────────────────────────────────────

describe("mergeCalibrationIntoScores", () => {
  const calibration = createSimulatorScenarioCalibration(BASE_PARAMS);
  // The base params are valid by construction; assert it here so the
  // suite doesn't accidentally drift into "calibration is null".
  if (!calibration.ok) throw new Error("fixture must construct a valid calibration");

  it("returns raw scores unchanged when calibration is null", () => {
    const raw = { bidAccuracy: 75, budgetAdherence: 80 };
    expect(mergeCalibrationIntoScores(raw, null)).toEqual(raw);
  });

  it("passes scores inside the band through unchanged", () => {
    // bidAccuracy band is [60, 95]; 80 is inside.
    const raw = { bidAccuracy: 80, budgetAdherence: 80 };
    const merged = mergeCalibrationIntoScores(raw, calibration.value);
    expect(merged.bidAccuracy).toBe(80);
    expect(merged.budgetAdherence).toBe(80);
  });

  it("clamps a score below the band to minScore", () => {
    const raw = { bidAccuracy: 20, budgetAdherence: 80 };
    const merged = mergeCalibrationIntoScores(raw, calibration.value);
    expect(merged.bidAccuracy).toBe(60); // clamped up to 60
  });

  it("clamps a score above the band to maxScore", () => {
    const raw = { bidAccuracy: 100, budgetAdherence: 80 };
    const merged = mergeCalibrationIntoScores(raw, calibration.value);
    expect(merged.bidAccuracy).toBe(95); // clamped down to 95
  });

  it("does not mutate the input record", () => {
    const raw = { bidAccuracy: 100, budgetAdherence: 80 };
    const snapshot = { ...raw };
    mergeCalibrationIntoScores(raw, calibration.value);
    expect(raw).toEqual(snapshot);
  });

  it("leaves a dimension untouched when its band is not configured", () => {
    const raw = { bidAccuracy: 100, otherDimension: 50 };
    const merged = mergeCalibrationIntoScores(raw, calibration.value);
    expect(merged.bidAccuracy).toBe(95);
    expect(merged.otherDimension).toBe(50); // no band -> passes through
  });

  it("the boundary case: a score at maxScore is not clamped", () => {
    const raw = { bidAccuracy: 95 };
    const merged = mergeCalibrationIntoScores(raw, calibration.value);
    expect(merged.bidAccuracy).toBe(95); // inclusive boundary
  });

  it("the boundary case: a score at minScore is not clamped", () => {
    const raw = { bidAccuracy: 60 };
    const merged = mergeCalibrationIntoScores(raw, calibration.value);
    expect(merged.bidAccuracy).toBe(60); // inclusive boundary
  });

  it("flips a borderline attempt's contribution (acceptance-criteria demo)", () => {
    // The acceptance-criteria verification asks: an instructor narrows
    // the bidAccuracy band, and an attempt at the boundary flip-flops.
    // The raw 95 (just inside the wider 100 cap) vs. raw 100 (just
    // outside the [60, 95] band) should yield the same post-clamp
    // contribution (95), whereas with no calibration they would be 95
    // vs. 100 — i.e. the attempt's overall score moves.
    const rawAtBoundary = { bidAccuracy: 100, budgetAdherence: 100 };
    const merged = mergeCalibrationIntoScores(rawAtBoundary, calibration.value);
    expect(merged.bidAccuracy).toBe(95);
    expect(merged.budgetAdherence).toBe(90);
  });
});
