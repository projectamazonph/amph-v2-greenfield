/**
 * ScorePolicy — defines how a submitted simulator attempt is graded.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 *
 * A ScorePolicy describes the grading rubric for one simulator at one
 * difficulty/mode combination: which dimensions matter, how much each
 * dimension is worth (weight), and what the overall passing threshold is.
 *
 * Pure domain — no side effects, no external dependencies.
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { Difficulty, SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import { Result } from "@/domain/shared/Result";

// ── Types ────────────────────────────────────────────────────────────────

/** Known grading dimension names. Extend as simulators add new ones. */
export type GradingDimension =
  "direction" | "magnitude" | "dataSufficiency" | "profitability" | "explanation";

export const KNOWN_DIMENSIONS: readonly GradingDimension[] = [
  "direction",
  "magnitude",
  "dataSufficiency",
  "profitability",
  "explanation",
];

/**
 * Per-dimension grading configuration.
 * weight:  0.0–1.0; weights across all configured dimensions must sum to 1.0.
 * passingThreshold: raw score (0–100) the student must hit on this dimension
 *                   to earn full credit. Below this, the dimension contributes
 *                   proportionally less (partial credit).
 */
export interface DimensionConfig {
  readonly weight: number;
  readonly passingThreshold: number;
}

export interface ScorePolicy {
  readonly id: string;
  readonly simulatorId: SimulatorId;
  readonly difficulty: Difficulty;
  readonly mode: SimulatorMode;
  /** Keyed by dimension name (e.g. "direction", "magnitude"). */
  readonly dimensionConfig: Record<string, DimensionConfig>;
  /** Minimum overall score (0–100) to consider the attempt passed. Default: 70. */
  readonly passingScore: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type ScorePolicyError =
  | { kind: "invalid_weight_sum"; total: number }
  | { kind: "unknown_dimension"; dimension: string }
  | { kind: "invalid_config"; reason: string };

// ── Factory ──────────────────────────────────────────────────────────────

export interface CreateScorePolicyParams {
  readonly id: string;
  readonly simulatorId: SimulatorId;
  readonly difficulty: Difficulty;
  readonly mode: SimulatorMode;
  readonly dimensionConfig: Record<string, DimensionConfig>;
  readonly passingScore?: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * Create a ScorePolicy. Validates:
 *  - All dimension names are known GradingDimension values
 *  - Weights sum to 1.0 (±0.001 tolerance)
 *  - passingScore is in 0–100
 */
export function createScorePolicy(
  params: CreateScorePolicyParams,
): Result<ScorePolicy, ScorePolicyError> {
  // ── 1. Validate all dimension names ────────────────────────────
  for (const dim of Object.keys(params.dimensionConfig)) {
    if (!KNOWN_DIMENSIONS.includes(dim as GradingDimension)) {
      return Result.err({ kind: "unknown_dimension", dimension: dim });
    }
  }

  // ── 2. Validate weight sum ────────────────────────────────────
  const totalWeight = Object.values(params.dimensionConfig).reduce(
    (sum, cfg) => sum + cfg.weight,
    0,
  );
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    return Result.err({ kind: "invalid_weight_sum", total: totalWeight });
  }

  // ── 3. Validate passingScore ────────────────────────────────
  const passingScore = params.passingScore ?? 70;
  if (passingScore < 0 || passingScore > 100) {
    return Result.err({ kind: "invalid_config", reason: "passingScore must be 0–100" });
  }

  return Result.ok({
    id: params.id,
    simulatorId: params.simulatorId,
    difficulty: params.difficulty,
    mode: params.mode,
    dimensionConfig: { ...params.dimensionConfig },
    passingScore,
    createdAt: params.createdAt ?? new Date(),
    updatedAt: params.updatedAt ?? new Date(),
  });
}

// ── Domain Functions ────────────────────────────────────────────────────

/**
 * Compute the overall weighted score from per-dimension raw scores.
 * Missing dimensions contribute 0. Result is capped at 0–100.
 *
 * Formula: sum(weight_i × (score_i / 100) × 100) — i.e. weighted average, capped.
 */
export function getOverallScore(
  scoreDimensions: Record<string, number>,
  policy: ScorePolicy,
): number {
  let total = 0;

  for (const [dimension, config] of Object.entries(policy.dimensionConfig)) {
    const rawScore = scoreDimensions[dimension];
    if (rawScore === undefined) continue;

    // Partial credit: score / 100 * weight * 100
    total += (Math.max(0, Math.min(100, rawScore)) / 100) * config.weight * 100;
  }

  return Math.round(Math.min(100, Math.max(0, total)));
}

/**
 * Determine whether the overall score meets the policy's passing threshold.
 */
export function isPassed(overallScore: number, policy: ScorePolicy): boolean {
  return overallScore >= policy.passingScore;
}

/**
 * Check whether a ScorePolicy is structurally valid.
 * Useful for validating persisted policies at hydration time.
 */
export function isValidPolicy(policy: ScorePolicy): boolean {
  // All dimension names must be known
  for (const dim of Object.keys(policy.dimensionConfig)) {
    if (!KNOWN_DIMENSIONS.includes(dim as GradingDimension)) {
      return false;
    }
  }

  // Weights must sum to 1.0
  const totalWeight = Object.values(policy.dimensionConfig).reduce(
    (sum, cfg) => sum + cfg.weight,
    0,
  );
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    return false;
  }

  // passingScore in range
  if (policy.passingScore < 0 || policy.passingScore > 100) {
    return false;
  }

  return true;
}

/**
 * Return the weight for a given dimension, or 0 if not configured.
 */
export function getWeightForDimension(policy: ScorePolicy, dimension: string): number {
  return policy.dimensionConfig[dimension]?.weight ?? 0;
}

/**
 * Rehydrate a ScorePolicy from persisted plain data (repository adapter only).
 * Skips factory validation — use for trusted persisted data only.
 */
export function hydrateScorePolicy(
  plain: Omit<ScorePolicy, "createdAt" | "updatedAt"> & {
    createdAt: Date;
    updatedAt: Date;
  },
): ScorePolicy {
  return { ...plain };
}
