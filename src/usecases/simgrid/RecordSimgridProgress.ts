/**
 * RecordSimgridProgress — persist a single SimGrid bridge attempt.
 *
 * ADR-026: SimGrid integration. The vendored static site's bridge
 * posts one summary row per completed round; this use case validates
 * the row, mints a fresh id, and forwards to the repository.
 *
 * `Clock` is held on the constructor for future time-bucketing
 * (e.g. rolling best-score windows); the bridge already supplies
 * `completedAt`, so it is not consulted today.
 */

import { Result } from "@/domain/shared/Result";
import {
  isSimgridSimulatorId,
  type SimgridAttempt,
  type SimgridSimulatorId,
} from "@/domain/simgrid";
import type {
  ISimgridAttemptRepository,
  SimgridAttemptRepositoryError,
} from "@/ports/simgrid/ISimgridAttemptRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface RecordSimgridProgressInput {
  readonly userId: string;
  readonly simulatorId: SimgridSimulatorId;
  readonly score: number;
  readonly passed: boolean;
  readonly completedAt: Date;
  readonly scenarioVersion: string;
  readonly rubricVersion: string;
  readonly scenarioId?: string;
  readonly policyVersion?: string;
}

export type RecordSimgridProgressError =
  { kind: "invalid_input"; message: string } | SimgridAttemptRepositoryError;

export interface RecordSimgridProgressDeps {
  simgridAttemptRepo: ISimgridAttemptRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export class RecordSimgridProgress {
  constructor(private readonly deps: RecordSimgridProgressDeps) {}

  async execute(
    input: RecordSimgridProgressInput,
  ): Promise<Result<{ id: string }, RecordSimgridProgressError>> {
    if (!input.userId) {
      return Result.err({ kind: "invalid_input", message: "userId required" });
    }
    if (!isSimgridSimulatorId(input.simulatorId)) {
      return Result.err({ kind: "invalid_input", message: "unknown simulatorId" });
    }
    if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100) {
      return Result.err({ kind: "invalid_input", message: "score must be in [0,100]" });
    }
    if (typeof input.passed !== "boolean") {
      return Result.err({ kind: "invalid_input", message: "passed must be boolean" });
    }
    if (Number.isNaN(input.completedAt.getTime())) {
      return Result.err({ kind: "invalid_input", message: "completedAt invalid" });
    }
    if (!input.scenarioVersion) {
      return Result.err({ kind: "invalid_input", message: "scenarioVersion required" });
    }
    if (!input.rubricVersion) {
      return Result.err({ kind: "invalid_input", message: "rubricVersion required" });
    }

    const attempt: SimgridAttempt = {
      id: this.deps.idGen.newId(),
      userId: input.userId,
      simulatorId: input.simulatorId,
      score: input.score,
      passed: input.passed,
      completedAt: input.completedAt,
      scenarioVersion: input.scenarioVersion,
      rubricVersion: input.rubricVersion,
      ...(input.scenarioId !== undefined ? { scenarioId: input.scenarioId } : {}),
      ...(input.policyVersion !== undefined ? { policyVersion: input.policyVersion } : {}),
    };

    const recorded = await this.deps.simgridAttemptRepo.record(attempt);
    if (!recorded.ok) return Result.err(recorded.error);
    return Result.ok({ id: attempt.id });
  }
}
