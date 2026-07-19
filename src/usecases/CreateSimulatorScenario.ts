/**
 * CreateSimulatorScenario — admin creates a new simulator scenario.
 *
 * STORY-050b.
 *
 * Flow:
 *  1. Validate inputs via the entity factory
 *  2. Persist via scenarioRepo.create
 *  3. Record audit log (best-effort)
 *  4. Return the created scenario
 */

import { Result } from "@/domain/shared/Result";
import {
  createSimulatorScenario,
  type SimulatorScenario,
  type SimulatorId,
  type Difficulty,
} from "@/domain/entities/SimulatorScenario";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface CreateSimulatorScenarioInput {
  id: string;
  simulatorId: SimulatorId;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  difficulty: Difficulty;
  estimatedMinutes: number;
  actorId: string;
}

export type CreateSimulatorScenarioError =
  | { kind: "invalid_simulator_id" }
  | { kind: "invalid_difficulty" }
  | { kind: "id_conflict"; message: string }
  | { kind: "db_error"; message: string };

export type CreateSimulatorScenarioResult = Result<
  { scenario: SimulatorScenario },
  CreateSimulatorScenarioError
>;

export interface CreateSimulatorScenarioDeps {
  scenarioRepo: ISimulatorScenarioRepository;
  recordAuditLog: RecordAuditLog;
}

export class CreateSimulatorScenario {
  constructor(private readonly deps: CreateSimulatorScenarioDeps) {}

  async execute(
    input: CreateSimulatorScenarioInput,
  ): Promise<CreateSimulatorScenarioResult> {
    // ── 1. Validate via entity factory ───────────────────
    const buildResult = createSimulatorScenario({
      id: input.id,
      simulatorId: input.simulatorId,
      name: input.name,
      description: input.description,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      difficulty: input.difficulty,
      estimatedMinutes: input.estimatedMinutes,
    });
    if (!buildResult.ok) {
      if (buildResult.error.kind === "invalid_simulator_id") {
        return Result.err({ kind: "invalid_simulator_id" });
      }
      if (buildResult.error.kind === "invalid_difficulty") {
        return Result.err({ kind: "invalid_difficulty" });
      }
      return Result.err({ kind: "invalid_difficulty" });
    }
    const scenario = buildResult.value;

    // ── 2. Persist ────────────────────────────────────────
    const persistResult = await this.deps.scenarioRepo.create(scenario);
    if (!persistResult.ok) {
      if (
        persistResult.error.kind === "db_error" &&
        persistResult.error.kind === "db_error" && persistResult.error.message.includes("already exists")
      ) {
        return Result.err({ kind: "id_conflict", message: persistResult.error.kind === "db_error" ? persistResult.error.message : "Conflict" });
      }
      return Result.err({
        kind: "db_error",
        message: persistResult.error.kind === "db_error" ? persistResult.error.message : "Failed to create scenario",
      });
    }

    // ── 3. Audit log — best-effort ─────────────────────────
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "simulator.created",
      targetType: "simulator_scenario",
      targetId: scenario.id,
      metadata: {
        simulatorId: scenario.simulatorId,
        name: scenario.name,
        difficulty: scenario.difficulty,
      },
    });

    return Result.ok({ scenario });
  }
}
