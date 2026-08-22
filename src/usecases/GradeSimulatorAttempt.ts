/**
 * GradeSimulatorAttempt — scores a submitted attempt against its ScorePolicy.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 * STORY-086: applies instructor calibration ranges before computing the
 * overall score (clamp, not reject — see `mergeCalibrationIntoScores`).
 *
 * Rules:
 *  1. Attempt must exist and be in submitted status
 *  2. A ScorePolicy must exist for (simulatorId, difficulty, mode)
 *  3. All score dimension keys must be defined in the policy
 *  4. Calibration (if any) clamps per-dimension raw scores into bands
 *  5. Overall score is computed as a weighted average of clamped dimension scores
 *  6. Attempt transitions: submitted -> graded with score + dimensions persisted
 */

import { Result } from "@/domain/shared/Result";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";
import { getOverallScore, isPassed } from "@/domain/entities/ScorePolicy";
import type { SimulatorAttempt, SimulatorAttemptError } from "@/domain/entities/SimulatorAttempt";
import { mergeCalibrationIntoScores } from "@/domain/entities/SimulatorScenarioCalibration";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";
import type { ISimulatorScenarioCalibrationRepository } from "@/ports/repositories/ISimulatorScenarioCalibrationRepository";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { Clock } from "@/ports/system/Clock";

// ── Input / Output ────────────────────────────────────────────────────────

export interface GradeSimulatorAttemptInput {
  attemptId: string;
  /**
   * Per-dimension raw scores (0–100). Keys must match the dimension names
   * defined in the ScorePolicy for this attempt's (simulatorId, difficulty, mode).
   */
  scoreDimensions: Record<string, number>;
}

export interface GradeSimulatorAttemptDeps {
  attemptRepo: ISimulatorAttemptRepository;
  scorePolicyRepo: IScorePolicyRepository;
  calibrationRepo: ISimulatorScenarioCalibrationRepository;
  scenarioRepo: ISimulatorScenarioRepository;
  clock: Clock;
}

export type GradeSimulatorAttemptError =
  | { kind: "attempt_not_found" }
  | { kind: "attempt_not_submitted" }
  | { kind: "attempt_already_graded" }
  | { kind: "policy_not_found" }
  | { kind: "invalid_dimensions"; missing: string[] }
  | { kind: "db_error"; message: string };

export interface GradeSimulatorAttemptResult {
  readonly attemptId: string;
  readonly overallScore: number;
  readonly scoreDimensions: Record<string, number>;
  readonly isPassed: boolean;
  readonly gradedAt: Date;
}

// ── Use Case ──────────────────────────────────────────────────────────────

export class GradeSimulatorAttempt {
  constructor(private readonly deps: GradeSimulatorAttemptDeps) {}

  async execute(
    input: GradeSimulatorAttemptInput,
  ): Promise<Result<GradeSimulatorAttemptResult, GradeSimulatorAttemptError>> {
    const { attemptRepo, scorePolicyRepo, calibrationRepo, scenarioRepo, clock } = this.deps;

    // ── 1. Load attempt ───────────────────────────────────────────────────
    const attemptResult = await attemptRepo.findByAttemptId(input.attemptId);
    if (Result.isErr(attemptResult)) {
      return Result.err(mapDbError(attemptResult.error));
    }
    if (attemptResult.value === null) {
      return Result.err({ kind: "attempt_not_found" });
    }

    const attempt = attemptResult.value;

    // ── 2. Assert status is submitted ─────────────────────────────────────
    if (attempt.status === "in_progress") {
      return Result.err({ kind: "attempt_not_submitted" });
    }
    if (attempt.status === "graded") {
      return Result.err({ kind: "attempt_already_graded" });
    }
    if (attempt.status === "expired") {
      return Result.err({ kind: "attempt_not_submitted" });
    }

    // ── 3. Find ScorePolicy ───────────────────────────────────────────────
    const policyResult = await scorePolicyRepo.findBySimulatorAndDifficulty(
      attempt.simulatorId,
      attempt.difficulty,
      attempt.mode,
    );
    if (Result.isErr(policyResult)) {
      return Result.err(mapDbError(policyResult.error));
    }
    const policy = policyResult.value;
    if (policy === null) {
      return Result.err({ kind: "policy_not_found" });
    }

    // ── 4. Validate dimension keys ────────────────────────────────────────
    const unknownKeys = Object.keys(input.scoreDimensions).filter(
      (k) => !(k in policy.dimensionConfig),
    );
    if (unknownKeys.length > 0) {
      return Result.err({ kind: "invalid_dimensions", missing: unknownKeys });
    }

    // ── 4a. Apply instructor calibration (STORY-086) ─────────────────────
    // Calibrations are keyed by (simulatorId, scenarioKey). Look up the
    // scenario via scenarioRepo to get the family key, then look up the
    // calibration. A missing scenario or missing calibration is fine — both
    // fall through to "no calibration" and the raw scores pass through.
    let clampedDimensions: Record<string, number> = { ...input.scoreDimensions };
    const scenarioResult = await scenarioRepo.findById(attempt.scenarioId);
    if (Result.isOk(scenarioResult) && scenarioResult.value !== null) {
      const calibrationResult = await calibrationRepo.findBySimulatorAndScenarioKey(
        attempt.simulatorId,
        scenarioResult.value.scenarioKey,
      );
      if (Result.isOk(calibrationResult)) {
        clampedDimensions = mergeCalibrationIntoScores(
          input.scoreDimensions,
          calibrationResult.value,
        );
      }
    }

    // ── 5. Compute overall score (uses clamped dimensions) ────────────────
    const overallScore = getOverallScore(clampedDimensions, policy);
    const passed = isPassed(overallScore, policy);
    // Timestamp is the use case's responsibility (not the repo's).
    // Source: the injected Clock port, so this is deterministic
    // under test fakes and traceable to the system clock in prod.
    const gradedAt = clock.now();

    // ── 6. Persist grade ─────────────────────────────────────────────────
    const updateResult = await attemptRepo.updateStatus(attempt.id, "graded", {
      score: overallScore,
      scoreDimensions: clampedDimensions,
      gradedAt,
    });

    if (Result.isErr(updateResult)) {
      return Result.err(mapDbError(updateResult.error));
    }

    const updatedAttempt = updateResult.value;
    if (updatedAttempt.status !== "graded") {
      return Result.err({ kind: "db_error", message: "Failed to transition attempt to graded" });
    }

    return Result.ok({
      attemptId: attempt.attemptId,
      overallScore,
      scoreDimensions: clampedDimensions,
      isPassed: passed,
      gradedAt,
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function mapDbError(err: SimulatorAttemptError): GradeSimulatorAttemptError {
  if (err.kind === "db_error") {
    return { kind: "db_error", message: err.message };
  }
  return { kind: "db_error", message: String(err) };
}
