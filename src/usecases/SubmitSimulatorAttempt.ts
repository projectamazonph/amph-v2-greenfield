/**
 * SubmitSimulatorAttempt — transitions an attempt from in_progress to submitted.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * Rules:
 *  1. Attempt must exist and be in_progress
 *  2. At least one decision must have been saved
 *  3. Transition status to submitted, set submittedAt
 *  4. Idempotent: if already submitted, returns already_submitted error
 *  5. Score is NOT set here (scoring is STORY-065)
 */

import { Result } from "@/domain/shared/Result";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";

export interface SubmitSimulatorAttemptInput {
  attemptId: string;
  idempotencyKey?: string;
}

export interface SubmitSimulatorAttemptDeps {
  attemptRepo: ISimulatorAttemptRepository;
}

export type SubmitSimulatorAttemptError =
  | { kind: "attempt_not_found" }
  | { kind: "attempt_not_in_progress" }
  | { kind: "no_decisions_made" }
  | { kind: "already_submitted" }
  | { kind: "db_error"; message: string };

export interface SubmitSimulatorAttemptResult {
  readonly status: "submitted";
  readonly submittedAt: Date;
}

export class SubmitSimulatorAttempt {
  constructor(private readonly deps: SubmitSimulatorAttemptDeps) {}

  async execute(
    input: SubmitSimulatorAttemptInput,
  ): Promise<Result<SubmitSimulatorAttemptResult, SubmitSimulatorAttemptError>> {
    const { attemptRepo } = this.deps;

    // ── 1. Attempt must exist ───────────────────────────────────
    const attemptResult = await attemptRepo.findByAttemptId(input.attemptId);
    if (Result.isErr(attemptResult)) {
      const err = attemptResult.error;
      return Result.err({
        kind: "db_error",
        message: err.kind === "db_error" ? err.message : String(err),
      } as SubmitSimulatorAttemptError);
    }
    if (attemptResult.value === null) {
      return Result.err({ kind: "attempt_not_found" });
    }

    const attempt = attemptResult.value;

    // ── Idempotency: already submitted ─────────────────────────
    if (attempt.status === "submitted") {
      return Result.err({ kind: "already_submitted" });
    }

    if (attempt.status === "graded" || attempt.status === "expired") {
      return Result.err({ kind: "attempt_not_in_progress" });
    }

    // ── 2. At least one decision must exist ─────────────────────
    if (attempt.decisions.length === 0) {
      return Result.err({ kind: "no_decisions_made" });
    }

    // ── 3. Transition to submitted ─────────────────────────────
    const updateResult = await attemptRepo.updateStatus(attempt.id, "submitted");
    return this.mapToSubmitResult(
      updateResult as unknown as Result<SimulatorAttempt, SubmitSimulatorAttemptError>,
    );
  }

  private mapToSubmitResult(
    result: Result<SimulatorAttempt, SubmitSimulatorAttemptError>,
  ): Result<SubmitSimulatorAttemptResult, SubmitSimulatorAttemptError> {
    if (Result.isErr(result)) {
      if (result.error.kind === "already_submitted") {
        return Result.err({ kind: "already_submitted" });
      }
      if (result.error.kind === "db_error") {
        return Result.err(result.error);
      }
      return Result.err({ kind: "attempt_not_in_progress" });
    }

    const attempt = result.value;
    if (attempt.status !== "submitted" || !attempt.submittedAt) {
      return Result.err({ kind: "attempt_not_in_progress" });
    }

    return Result.ok({
      status: "submitted",
      submittedAt: attempt.submittedAt,
    });
  }
}
