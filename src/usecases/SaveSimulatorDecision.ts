/**
 * SaveSimulatorDecision — records a student's decision within an active attempt.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * Rules:
 *  1. Attempt must exist and be in_progress
 *  2. decisionData must not be empty (empty submissions never pass)
 *  3. Append decision with next revision number
 *  4. Return updated attempt with revision info
 */

import { Result } from "@/domain/shared/Result";
import { createSimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";

export interface SaveSimulatorDecisionInput {
  attemptId: string;
  decisionData: Record<string, unknown>;
}

export interface SaveSimulatorDecisionDeps {
  attemptRepo: ISimulatorAttemptRepository;
}

export type SaveSimulatorDecisionError =
  | { kind: "attempt_not_found" }
  | { kind: "attempt_not_in_progress" }
  | { kind: "empty_submission" }
  | { kind: "db_error"; message: string };

export interface SaveSimulatorDecisionResult {
  readonly attemptId: string;
  readonly revision: number;
  readonly decisionData: Record<string, unknown>;
  readonly savedAt: Date;
}

export class SaveSimulatorDecision {
  constructor(private readonly deps: SaveSimulatorDecisionDeps) {}

  async execute(
    input: SaveSimulatorDecisionInput,
  ): Promise<Result<SaveSimulatorDecisionResult, SaveSimulatorDecisionError>> {
    const { attemptRepo } = this.deps;

    // ── 1. Attempt must exist and be in_progress ───────────────
    const attemptResult = await attemptRepo.findByAttemptId(input.attemptId);
    if (Result.isErr(attemptResult)) {
      const err = attemptResult.error;
      return Result.err({
        kind: "db_error",
        message: err.kind === "db_error" ? err.message : String(err),
      } as SaveSimulatorDecisionError);
    }
    if (attemptResult.value === null) {
      return Result.err({ kind: "attempt_not_found" });
    }

    const attempt = attemptResult.value;
    if (attempt.status !== "in_progress") {
      return Result.err({ kind: "attempt_not_in_progress" });
    }

    // ── 2. decisionData must not be empty ───────────────────────
    if (Object.keys(input.decisionData).length === 0) {
      return Result.err({ kind: "empty_submission" });
    }

    // ── 3. Append decision with next revision ───────────────────
    const nextRevision = attempt.decisions.length + 1;
    const decisionCreateResult = createSimulatorDecision({
      id: `dec_${attempt.id}_r${nextRevision}`,
      attemptId: attempt.id,
      decisionData: input.decisionData,
      revision: nextRevision,
    });
    // createSimulatorDecision always returns ok (error type is never)
    const decision = (decisionCreateResult as { value: SimulatorDecision }).value;

    const addResult = await attemptRepo.addDecision(attempt.id, decision);
    if (Result.isErr(addResult)) {
      return Result.err(addResult.error as unknown as SaveSimulatorDecisionError);
    }

    // ── 4. Return revision info ─────────────────────────────────
    return Result.ok({
      attemptId: attempt.attemptId,
      revision: decision.revision,
      decisionData: decision.decisionData,
      savedAt: decision.submittedAt,
    });
  }
}
