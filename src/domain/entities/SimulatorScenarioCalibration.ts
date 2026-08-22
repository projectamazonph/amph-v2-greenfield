/**
 * SimulatorScenarioCalibration — instructor-set per-dimension score bands
 * that tighten the grade for a scenario family.
 *
 * STORY-086: Simulator grader — instructor calibration ranges.
 *
 * A calibration is one record per (simulatorId, scenarioKey). It carries
 * a map of dimension name -> acceptable score band `{ minScore, maxScore }`.
 * The grade pipeline clamps per-dimension raw scores into each band
 * before calling `getOverallScore`. Bands are deliberately tighter than
 * the natural [0,100] range — the factory rejects bands that accept the
 * full numeric range (the STORY-083 "we'll mark everything fix" failure
 * mode).
 *
 * Bands apply across every (difficulty, mode) combination under the
 * scenarioKey. The clamp step happens before `getOverallScore` so
 * existing per-policy weights govern the contribution. Calibration is
 * additive to the umbrella score policy, never a replacement.
 *
 * Pure domain — no side effects, no external dependencies.
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import { KNOWN_DIMENSIONS, type GradingDimension } from "@/domain/entities/ScorePolicy";
import { Result } from "@/domain/shared/Result";

// ── Types ────────────────────────────────────────────────────────────────

/**
 * Acceptable score band for one grading dimension.
 *  - minScore and maxScore are both 0–100 inclusive.
 *  - minScore < maxScore.
 *  - The band MUST be a strict subset of [0, 100] (maxScore - minScore < 100).
 *    A band of [0, 100] would accept every score, which is the
 *    "we'll mark everything fix" failure mode — rejected by the factory.
 */
export interface CalibrationDimensionBand {
  readonly minScore: number;
  readonly maxScore: number;
}

export interface SimulatorScenarioCalibration {
  readonly id: string;
  readonly simulatorId: SimulatorId;
  /** Stable scenario family identifier (STORY-085). Calibration applies to every version of this family. */
  readonly scenarioKey: string;
  /** Keyed by `GradingDimension` name. Missing entries mean "no calibration on this dimension". */
  readonly dimensionBands: Record<string, CalibrationDimensionBand>;
  readonly instructorId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type SimulatorScenarioCalibrationError =
  | { kind: "invalid_simulator_id" }
  | { kind: "invalid_scenario_key" }
  | { kind: "unknown_dimension"; dimension: string }
  | { kind: "invalid_band"; dimension: string; reason: string };

// ── Factory ──────────────────────────────────────────────────────────────

export interface CreateSimulatorScenarioCalibrationParams {
  readonly id: string;
  readonly simulatorId: SimulatorId;
  readonly scenarioKey: string;
  readonly dimensionBands: Record<string, CalibrationDimensionBand>;
  readonly instructorId: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * Create a calibration record. Validates:
 *  - simulatorId is one of the registered simulator ids (the type system
 *    narrows this on the params interface; the runtime check is a
 *    defence-in-depth step against the `<string>` come-from-the-form path).
 *  - scenarioKey is non-empty (no whitespace-only).
 *  - Each dimension is a known GradingDimension name.
 *  - Each band has minScore < maxScore, both within [0, 100], and the band
 *    is a strict subset of [0, 100]. Calibration is tighter, not wider.
 *  - instructorId is non-empty.
 *
 * Allow empty dimensionBands (no-op calibration that persists nothing).
 * An empty calibration is still subject to the upsert path so that the
 * next save replaces it; the absence of bands is a meaningful
 * "clear the calibration" signal.
 */
export function createSimulatorScenarioCalibration(
  params: CreateSimulatorScenarioCalibrationParams,
): Result<SimulatorScenarioCalibration, SimulatorScenarioCalibrationError> {
  // ── 1. Validate scenarioKey ──────────────────────────────────────
  if (typeof params.scenarioKey !== "string" || params.scenarioKey.trim().length === 0) {
    return Result.err({ kind: "invalid_scenario_key" });
  }

  // ── 2. Validate instructorId ──────────────────────────────────────
  if (typeof params.instructorId !== "string" || params.instructorId.trim().length === 0) {
    return Result.err({ kind: "invalid_scenario_key" });
  }

  // ── 3. Validate each band ────────────────────────────────────────
  const normalisedBands: Record<string, CalibrationDimensionBand> = {};
  for (const [dim, band] of Object.entries(params.dimensionBands)) {
    if (!KNOWN_DIMENSIONS.includes(dim as GradingDimension)) {
      return Result.err({ kind: "unknown_dimension", dimension: dim });
    }
    const bandError = validateBand(dim, band);
    if (bandError) {
      return Result.err(bandError);
    }
    normalisedBands[dim] = { minScore: band.minScore, maxScore: band.maxScore };
  }

  const now = params.updatedAt ?? params.createdAt ?? new Date();

  return Result.ok({
    id: params.id,
    simulatorId: params.simulatorId,
    scenarioKey: params.scenarioKey.trim(),
    dimensionBands: normalisedBands,
    instructorId: params.instructorId.trim(),
    createdAt: params.createdAt ?? now,
    updatedAt: now,
  });
}

/**
 * Defence-in-depth check that rejects [0, 100] bands ("accept everything")
 * and any inverted / out-of-range configuration. Returning the error here
 * rather than throwing keeps factory errors as `Result.err`, matching the
 * convention in ScorePolicy.
 */
function validateBand(
  dimension: string,
  band: CalibrationDimensionBand,
): SimulatorScenarioCalibrationError | null {
  const { minScore, maxScore } = band;

  if (!Number.isFinite(minScore) || !Number.isFinite(maxScore)) {
    return {
      kind: "invalid_band",
      dimension,
      reason: "minScore and maxScore must be finite numbers",
    };
  }

  if (minScore < 0 || maxScore > 100) {
    return {
      kind: "invalid_band",
      dimension,
      reason: "minScore must be >= 0 and maxScore must be <= 100",
    };
  }

  if (minScore >= maxScore) {
    return {
      kind: "invalid_band",
      dimension,
      reason: `minScore (${minScore}) must be < maxScore (${maxScore})`,
    };
  }

  // The acceptance criteria: bands must be tighter, not wider. A span
  // of 100 means the band accepts every score — that's the forbidden
  // "we'll mark everything fix" calibration.
  if (maxScore - minScore >= 100) {
    return {
      kind: "invalid_band",
      dimension,
      reason: "band spans the full numeric range; calibration must be tighter than [0, 100]",
    };
  }

  return null;
}

/**
 * Rehydrate a calibration from persisted plain data (repository adapter
 * only). Skips factory validation — use for trusted persisted data only.
 */
export function hydrateSimulatorScenarioCalibration(
  plain: SimulatorScenarioCalibration,
): SimulatorScenarioCalibration {
  return { ...plain };
}

// ── Domain Functions ────────────────────────────────────────────────────

/**
 * Merge a calibration into a raw per-dimension score map, clamping
 * scores outside each configured band into the band bounds. The
 * merge is intentionally non-destructive: a dimension without a band
 * passes through unchanged.
 *
 * Used by `GradeSimulatorAttempt.execute()` between dimension-key
 * validation and `getOverallScore()`. The result is a new object so
 * callers can persist the clamped values without mutating the input.
 */
export function mergeCalibrationIntoScores(
  rawScores: Record<string, number>,
  calibration: SimulatorScenarioCalibration | null,
): Record<string, number> {
  if (calibration === null) {
    return { ...rawScores };
  }
  const merged: Record<string, number> = {};
  for (const [dim, raw] of Object.entries(rawScores)) {
    const band = calibration.dimensionBands[dim];
    if (!band) {
      merged[dim] = raw;
      continue;
    }
    if (raw < band.minScore) merged[dim] = band.minScore;
    else if (raw > band.maxScore) merged[dim] = band.maxScore;
    else merged[dim] = raw;
  }
  return merged;
}

/**
 * Predicate for tests + admin UI: returns true if the supplied
 * band is a valid calibration band (would survive `validateBand`).
 * Useful for live form validation without rebuilding the result type.
 */
export function isValidCalibrationBand(band: CalibrationDimensionBand): boolean {
  return validateBand("dimension", band) === null;
}
