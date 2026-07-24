/**
 * ComposeAttemptFeedback — generates actionable feedback for a graded simulator attempt.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 *
 * Rules:
 *  1. Attempt must exist
 *  2. Attempt must be in "graded" status
 *  3. A ScorePolicy must exist for (simulatorId, difficulty, mode)
 *  4. Feedback is composed via the pure composeAttemptFeedback domain function
 *  5. Feedback is persisted to the repository
 */

import { Result } from "@/domain/shared/Result";
import type { AttemptFeedback } from "@/domain/entities/AttemptFeedback";
import { composeAttemptFeedback } from "@/domain/entities/AttemptFeedback";
import type { SimulatorAttempt, SimulatorAttemptError } from "@/domain/entities/SimulatorAttempt";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";
import type {
  IAttemptFeedbackRepository,
  AttemptFeedbackError,
} from "@/ports/repositories/IAttemptFeedbackRepository";

// ── Input / Output ─────────────────────────────────────────────────────

export interface ComposeAttemptFeedbackInput {
  readonly attemptId: string;
}

export interface ComposeAttemptFeedbackDeps {
  readonly attemptRepo: ISimulatorAttemptRepository;
  readonly scorePolicyRepo: IScorePolicyRepository;
  readonly feedbackRepo: IAttemptFeedbackRepository;
}

export type ComposeAttemptFeedbackError =
  | { kind: "attempt_not_found" }
  | { kind: "attempt_not_graded" }
  | { kind: "policy_not_found" }
  | { kind: "db_error"; message: string };

export interface ComposeAttemptFeedbackResult {
  readonly feedback: AttemptFeedback;
}

// ── Use Case ─────────────────────────────────────────────────────────

export class ComposeAttemptFeedback {
  constructor(private readonly deps: ComposeAttemptFeedbackDeps) {}

  async execute(
    _input: ComposeAttemptFeedbackInput,
  ): Promise<Result<ComposeAttemptFeedbackResult, ComposeAttemptFeedbackError>> {
    const { attemptRepo, scorePolicyRepo, feedbackRepo } = this.deps;

    // ── 1. Load attempt ────────────────────────────────────────────
    const attemptResult = await attemptRepo.findByAttemptId(_input.attemptId);
    if (Result.isErr(attemptResult)) {
      return Result.err(mapAttemptDbError(attemptResult.error));
    }
    if (attemptResult.value === null) {
      return Result.err({ kind: "attempt_not_found" });
    }

    const attempt = attemptResult.value;

    // ── 2. Assert attempt is graded ──────────────────────────────
    if (attempt.status !== "graded") {
      return Result.err({ kind: "attempt_not_graded" });
    }

    // ── 3. Find ScorePolicy ────────────────────────────────────────
    const policyResult = await scorePolicyRepo.findBySimulatorAndDifficulty(
      attempt.simulatorId,
      attempt.difficulty,
      attempt.mode,
    );
    if (Result.isErr(policyResult)) {
      return Result.err(mapPolicyDbError(policyResult.error));
    }
    if (policyResult.value === null) {
      return Result.err({ kind: "policy_not_found" });
    }

    const policy = policyResult.value;

    // ── 4. Compose feedback (pure domain function) ─────────────────
    const feedback = composeAttemptFeedback({ attempt, policy });

    // ── 5. Persist feedback ────────────────────────────────────────
    const createResult = await feedbackRepo.create(feedback);
    if (Result.isErr(createResult)) {
      return Result.err(mapFeedbackDbError(createResult.error));
    }

    return Result.ok({ feedback });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function mapAttemptDbError(err: SimulatorAttemptError): ComposeAttemptFeedbackError {
  if (err.kind === "db_error") {
    return { kind: "db_error", message: err.message };
  }
  return { kind: "db_error", message: String(err) };
}

function mapPolicyDbError(err: unknown): ComposeAttemptFeedbackError {
  if (
    typeof err === "object" &&
    err !== null &&
    "kind" in err &&
    (err as { kind: string }).kind === "db_error"
  ) {
    return {
      kind: "db_error",
      message: (err as unknown as { message: string }).message,
    };
  }
  return { kind: "db_error", message: String(err) };
}

function mapFeedbackDbError(err: AttemptFeedbackError): ComposeAttemptFeedbackError {
  return { kind: "db_error", message: err.message };
}
