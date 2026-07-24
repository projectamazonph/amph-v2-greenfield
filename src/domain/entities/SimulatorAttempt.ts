/**
 * SimulatorAttempt — entity representing a student's attempt at a simulator scenario.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * State machine:
 *   in_progress -> submitted  (via submitAttempt())
 *   in_progress -> expired     (via expireAttempt(), future cron job)
 *   submitted   -> graded      (via gradeAttempt(), scoring service)
 *
 * All other transitions are invalid and return null.
 *
 * Decisions are stored inline (not a separate aggregate root) to keep the
 * persistence model simple. Each addDecision() call returns a new attempt
 * instance with the decision appended.
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";
import { Result } from "@/domain/shared/Result";

/**
 * Error types for SimulatorAttempt operations.
 * Defined here to avoid circular deps between entity and port.
 */
export type SimulatorAttemptError =
  | { kind: "not_found" }
  | { kind: "already_submitted" }
  | { kind: "already_graded" }
  | { kind: "invalid_status_transition" }
  | { kind: "db_error"; message: string };

// ── Types ────────────────────────────────────────────────────────────────

export type AttemptStatus = "in_progress" | "submitted" | "graded" | "expired";
export type SimulatorMode = "guided" | "practice" | "challenge" | "credential" | "instructor";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface ScoreDimensions {
  direction?: number;
  magnitude?: number;
  dataSufficiency?: number;
  profitability?: number;
  explanation?: number;
  // ... simulator-specific dimensions
  [key: string]: number | undefined;
}

export interface SimulatorAttempt {
  readonly id: string;
  readonly attemptId: string; // human-readable, e.g. "ATT-A1B2C3"
  readonly userId: string;
  readonly simulatorId: SimulatorId;
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly difficulty: Difficulty;
  readonly mode: SimulatorMode;
  readonly status: AttemptStatus;
  readonly seed: string | null;
  readonly score: number | null;
  readonly scoreDimensions: ScoreDimensions | null;
  readonly startedAt: Date;
  readonly submittedAt: Date | null;
  readonly gradedAt: Date | null;
  readonly decisions: readonly SimulatorDecision[];
}

// ── Factory ──────────────────────────────────────────────────────────────

export interface CreateSimulatorAttemptParams {
  readonly id: string;
  readonly attemptId: string;
  readonly userId: string;
  readonly simulatorId: SimulatorId;
  readonly scenarioId: string;
  readonly scenarioVersion?: number;
  readonly difficulty?: Difficulty;
  readonly mode?: SimulatorMode;
  readonly seed?: string | null;
}

/**
 * Create a new SimulatorAttempt with status=in_progress.
 * This factory never fails — all inputs are validated upstream by the use case.
 * Generates a seed for deterministic replay (stored now, used later).
 */
export function createSimulatorAttempt(params: CreateSimulatorAttemptParams): SimulatorAttempt {
  return {
    id: params.id,
    attemptId: params.attemptId,
    userId: params.userId,
    simulatorId: params.simulatorId,
    scenarioId: params.scenarioId,
    scenarioVersion: params.scenarioVersion ?? 1,
    difficulty: params.difficulty ?? "beginner",
    mode: params.mode ?? "practice",
    status: "in_progress",
    seed: params.seed !== undefined ? params.seed : generateSeed(),
    score: null,
    scoreDimensions: null,
    startedAt: new Date(),
    submittedAt: null,
    gradedAt: null,
    decisions: [],
  };
}

/**
 * Add a decision to an attempt. Returns a new attempt instance with
 * the decision appended to the decisions array.
 */
export function addDecision(
  attempt: SimulatorAttempt,
  decision: SimulatorDecision,
): Result<SimulatorAttempt, SimulatorAttemptError> {
  return Result.ok({
    ...attempt,
    decisions: [...attempt.decisions, decision],
  });
}

/**
 * Transition from in_progress to submitted. Returns null if the
 * attempt is not in_progress.
 */
export function submitAttempt(attempt: SimulatorAttempt): Result<SimulatorAttempt, null> {
  if (attempt.status !== "in_progress") {
    return Result.err(null);
  }
  return Result.ok({
    ...attempt,
    status: "submitted",
    submittedAt: new Date(),
  });
}

/**
 * Transition from in_progress to expired (e.g. time limit exceeded).
 * Returns null if the attempt is not in_progress.
 */
export function expireAttempt(attempt: SimulatorAttempt): Result<SimulatorAttempt, null> {
  if (attempt.status !== "in_progress") {
    return Result.err(null);
  }
  return Result.ok({
    ...attempt,
    status: "expired",
  });
}

/**
 * Transition from submitted to graded with score and dimensions.
 * Returns null if the attempt is not in submitted state.
 */
export function gradeAttempt(
  attempt: SimulatorAttempt,
  score: number,
  scoreDimensions: ScoreDimensions,
): Result<SimulatorAttempt, null> {
  if (attempt.status !== "submitted") {
    return Result.err(null);
  }
  return Result.ok({
    ...attempt,
    status: "graded",
    score,
    scoreDimensions,
    gradedAt: new Date(),
  });
}

/**
 * Reconstruct an attempt from persisted data (repository adapter only).
 * Bypasses state-machine guards that create() enforces.
 */
export function hydrateSimulatorAttempt(
  plain: Omit<SimulatorAttempt, "decisions"> & {
    decisions: readonly SimulatorDecision[];
  },
): SimulatorAttempt {
  return { ...plain };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function generateSeed(): string {
  // 8-character alphanumeric string for deterministic replay
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8)
    .toUpperCase();
}
