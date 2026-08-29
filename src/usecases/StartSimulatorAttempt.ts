/**
 * StartSimulatorAttempt ΓÇö begins a new simulator attempt for a student.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * Steps:
 *  1. Scenario must exist (via existing ISimulatorScenarioRepository)
 *  2. No other in_progress attempt for same user+scenario
 *  3. Generate attemptId = ATT-{ulid prefix} and a random seed
 *  4. Create and persist attempt with status=in_progress
 *  5. Log to audit log
 */

import { Result } from "@/domain/shared/Result";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";
import { hasEverPassedSimulatorInMode } from "@/usecases/CheckChallengeModeUnlocked";

export interface StartSimulatorAttemptInput {
  userId: string;
  simulatorId: SimulatorId;
  scenarioId: string;
  mode?: SimulatorMode;
}

export interface StartSimulatorAttemptDeps {
  attemptRepo: ISimulatorAttemptRepository;
  scorePolicyRepo: IScorePolicyRepository;
  scenarioRepo: ISimulatorScenarioRepository;
  idGen: { newId(): string };
  clock: { now(): Date };
  recordAuditLog: {
    execute(entry: {
      actorId: string;
      action: string;
      targetType: string;
      targetId: string;
      metadata?: Record<string, unknown>;
    }): Promise<{ recorded: boolean }>;
  };
}

export type StartSimulatorAttemptError =
  | { kind: "scenario_not_found" }
  | { kind: "already_in_progress" }
  | { kind: "challenge_locked" }
  | { kind: "mode_not_allowed" }
  | { kind: "db_error"; message: string };

export type StartSimulatorAttemptResult = Result<SimulatorAttempt, StartSimulatorAttemptError>;

export class StartSimulatorAttempt {
  constructor(private readonly deps: StartSimulatorAttemptDeps) {}

  async execute(input: StartSimulatorAttemptInput): Promise<StartSimulatorAttemptResult> {
    const { attemptRepo, scorePolicyRepo, scenarioRepo, idGen, clock, recordAuditLog } = this.deps;
    const mode = input.mode ?? "practice";

    if (
      !(["guided", "practice", "challenge", "credential", "instructor"] as const).includes(
        mode as never,
      )
    ) {
      return Result.err({ kind: "mode_not_allowed" });
    }

    if (mode === "challenge") {
      const unlocked = await hasEverPassedSimulatorInMode(
        { attemptRepo, scorePolicyRepo },
        { userId: input.userId, simulatorId: input.simulatorId, mode: "practice" },
      );
      if (!unlocked.ok) {
        return Result.err(unlocked.error);
      }
      if (!unlocked.value) {
        return Result.err({ kind: "challenge_locked" });
      }
    }

    // ΓöÇΓöÇ 1. Scenario must exist ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const scenarioResult = await scenarioRepo.findById(input.scenarioId);
    if (Result.isErr(scenarioResult)) {
      return Result.err({ kind: "scenario_not_found" });
    }
    if (scenarioResult.value === null) {
      return Result.err({ kind: "scenario_not_found" });
    }
    if (scenarioResult.value.simulatorId !== input.simulatorId) {
      return Result.err({ kind: "scenario_not_found" });
    }

    // ΓöÇΓöÇ 2. No existing in_progress attempt ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const existingResult = await attemptRepo.findByUserAndScenario(
      input.userId,
      input.simulatorId,
      input.scenarioId,
      { onlyInProgress: true },
    );
    if (Result.isErr(existingResult)) {
      const err = existingResult.error;
      return Result.err({
        kind: "db_error",
        message: err.kind === "db_error" ? err.message : String(err),
      } as StartSimulatorAttemptError);
    }
    if (existingResult.value.length > 0) {
      return Result.err({ kind: "already_in_progress" });
    }

    // ΓöÇΓöÇ 3. Generate attemptId ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const id = idGen.newId();
    const attemptId = `ATT-${id.slice(0, 8).toUpperCase()}`;

    // ΓöÇΓöÇ 4. Create attempt ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const attemptResult = createSimulatorAttempt({
      id,
      attemptId,
      userId: input.userId,
      simulatorId: input.simulatorId,
      scenarioId: input.scenarioId,
      scenarioVersion: scenarioResult.value.version,
      difficulty: scenarioResult.value.difficulty,
      mode,
      startedAt: clock.now(),
    });
    // createSimulatorAttempt never fails ΓÇö returns SimulatorAttempt directly
    const attempt = attemptResult;

    const createResult = await attemptRepo.create(attempt);
    if (Result.isErr(createResult)) {
      return Result.err({ kind: "db_error", message: createResult.error.message } as StartSimulatorAttemptError);
    }

    // ΓöÇΓöÇ 5. Audit log ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    await recordAuditLog.execute({
      actorId: input.userId,
      action: "simulator_attempt.started",
      targetType: "SimulatorAttempt",
      targetId: attemptId,
      metadata: {
        simulatorId: input.simulatorId,
        scenarioId: input.scenarioId,
        mode: attempt.mode,
        difficulty: attempt.difficulty,
      },
    });

    return Result.ok(attempt);
  }
}
