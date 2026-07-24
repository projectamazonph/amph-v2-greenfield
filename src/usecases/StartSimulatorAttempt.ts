/**
 * StartSimulatorAttempt — begins a new simulator attempt for a student.
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

export interface StartSimulatorAttemptInput {
  userId: string;
  simulatorId: SimulatorId;
  scenarioId: string;
  mode?: SimulatorMode;
}

export interface StartSimulatorAttemptDeps {
  attemptRepo: ISimulatorAttemptRepository;
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
  | { kind: "db_error"; message: string };

export type StartSimulatorAttemptResult = Result<SimulatorAttempt, StartSimulatorAttemptError>;

export class StartSimulatorAttempt {
  constructor(private readonly deps: StartSimulatorAttemptDeps) {}

  async execute(input: StartSimulatorAttemptInput): Promise<StartSimulatorAttemptResult> {
    const { attemptRepo, scenarioRepo, idGen, clock, recordAuditLog } = this.deps;

    // ── 1. Scenario must exist ─────────────────────────────────
    const scenarioResult = await scenarioRepo.findById(input.scenarioId);
    if (Result.isErr(scenarioResult)) {
      return Result.err({ kind: "scenario_not_found" });
    }
    if (scenarioResult.value === null) {
      return Result.err({ kind: "scenario_not_found" });
    }

    // ── 2. No existing in_progress attempt ─────────────────────
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

    // ── 3. Generate attemptId ───────────────────────────────────
    const id = idGen.newId();
    const attemptId = `ATT-${id.slice(0, 8).toUpperCase()}`;

    // ── 4. Create attempt ───────────────────────────────────────
    const attemptResult = createSimulatorAttempt({
      id,
      attemptId,
      userId: input.userId,
      simulatorId: input.simulatorId,
      scenarioId: input.scenarioId,
      scenarioVersion: 1,
      difficulty: scenarioResult.value.difficulty,
      mode: input.mode ?? "practice",
    });
    // createSimulatorAttempt never fails — returns SimulatorAttempt directly
    const attempt = attemptResult;

    const createResult = await attemptRepo.create(attempt);
    if (Result.isErr(createResult)) {
      return Result.err(createResult.error as unknown as StartSimulatorAttemptError);
    }

    // ── 5. Audit log ────────────────────────────────────────────
    await recordAuditLog.execute({
      actorId: input.userId,
      action: "simulator_attempt_start",
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
