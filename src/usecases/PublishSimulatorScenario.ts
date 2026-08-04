/**
 * PublishSimulatorScenario — admin publishes a draft scenario version.
 *
 * STORY-085.
 *
 * Flow:
 *  1. Find the scenario (must exist)
 *  2. Must be a draft (published/archived can't be re-published)
 *  3. Persist via scenarioRepo.publish (atomically archives any published
 *     sibling sharing the same scenarioKey)
 *  4. Record audit log (best-effort)
 *  5. Return the published scenario
 */

import { Result } from "@/domain/shared/Result";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface PublishSimulatorScenarioInput {
  id: string;
  actorId: string;
}

export type PublishSimulatorScenarioError =
  { kind: "scenario_not_found" } | { kind: "not_draft" } | { kind: "db_error"; message: string };

export type PublishSimulatorScenarioResult = Result<
  { scenario: SimulatorScenario },
  PublishSimulatorScenarioError
>;

export interface PublishSimulatorScenarioDeps {
  scenarioRepo: ISimulatorScenarioRepository;
  recordAuditLog: RecordAuditLog;
}

export class PublishSimulatorScenario {
  constructor(private readonly deps: PublishSimulatorScenarioDeps) {}

  async execute(input: PublishSimulatorScenarioInput): Promise<PublishSimulatorScenarioResult> {
    // ── 1. Find existing ──────────────────────────────────
    const findResult = await this.deps.scenarioRepo.findById(input.id);
    if (!findResult.ok) {
      return Result.err({
        kind: "db_error",
        message:
          findResult.error.kind === "db_error"
            ? findResult.error.message
            : "Failed to fetch scenario",
      });
    }
    if (findResult.value === null) {
      return Result.err({ kind: "scenario_not_found" });
    }
    if (findResult.value.status !== "draft") {
      return Result.err({ kind: "not_draft" });
    }

    // ── 2. Publish (atomic sibling-archival + publish) ────
    const publishResult = await this.deps.scenarioRepo.publish(input.id);
    if (!publishResult.ok) {
      if (publishResult.error.kind === "not_found") {
        return Result.err({ kind: "scenario_not_found" });
      }
      return Result.err({
        kind: "db_error",
        message:
          publishResult.error.kind === "db_error"
            ? publishResult.error.message
            : "Failed to publish scenario",
      });
    }
    const scenario = publishResult.value;

    // ── 3. Audit log — best-effort ────────────────────────
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "simulator.published",
      targetType: "simulator_scenario",
      targetId: scenario.id,
      metadata: {
        simulatorId: scenario.simulatorId,
        scenarioKey: scenario.scenarioKey,
        version: scenario.version,
      },
    });

    return Result.ok({ scenario });
  }
}
