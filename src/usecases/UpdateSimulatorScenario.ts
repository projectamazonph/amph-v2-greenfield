/**
 * UpdateSimulatorScenario — admin updates an existing simulator scenario.
 *
 * STORY-050b.
 *
 * Flow:
 *  1. Find the existing scenario
 *  2. Validate the updated fields via the entity factory
 *  3. Persist via scenarioRepo.update
 *  4. Record audit log (best-effort)
 *  5. Return the updated scenario
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

export interface UpdateSimulatorScenarioInput {
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

export type UpdateSimulatorScenarioError =
  | { kind: "scenario_not_found" }
  | { kind: "invalid_simulator_id" }
  | { kind: "invalid_difficulty" }
  | { kind: "db_error"; message: string };

export type UpdateSimulatorScenarioResult = Result<
  { scenario: SimulatorScenario },
  UpdateSimulatorScenarioError
>;

export interface UpdateSimulatorScenarioDeps {
  scenarioRepo: ISimulatorScenarioRepository;
  recordAuditLog: RecordAuditLog;
}

export class UpdateSimulatorScenario {
  constructor(private readonly deps: UpdateSimulatorScenarioDeps) {}

  async execute(
    input: UpdateSimulatorScenarioInput,
  ): Promise<UpdateSimulatorScenarioResult> {
    // ── 1. Find existing ──────────────────────────────────
    const findResult = await this.deps.scenarioRepo.findById(input.id);
    if (!findResult.ok) {
      return Result.err({
        kind: "db_error",
        message: findResult.error.kind === "db_error" ? findResult.error.message : "Failed to fetch scenario",
      });
    }
    if (findResult.value === null) {
      return Result.err({ kind: "scenario_not_found" });
    }

    // ── 2. Validate via entity factory ───────────────────
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
      return Result.err({ kind: "invalid_difficulty" });
    }
    const scenario = buildResult.value;

    // ── 3. Persist ────────────────────────────────────────
    const persistResult = await this.deps.scenarioRepo.update(scenario);
    if (!persistResult.ok) {
      return Result.err({
        kind: "db_error",
        message: persistResult.error.kind === "db_error" ? persistResult.error.message : "Failed to update scenario",
      });
    }

    // ── 4. Audit log — best-effort ────────────────────────
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "simulator.updated",
      targetType: "simulator_scenario",
      targetId: scenario.id,
      metadata: { simulatorId: scenario.simulatorId, name: scenario.name },
    });

    return Result.ok({ scenario });
  }
}
