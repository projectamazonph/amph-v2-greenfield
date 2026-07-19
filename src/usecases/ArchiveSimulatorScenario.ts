/**
 * ArchiveSimulatorScenario — admin archives (soft-deletes) a simulator scenario.
 *
 * STORY-050b.
 *
 * Idempotent: archiving an already-archived scenario returns success
 * (wasAlreadyArchived=true). This lets the admin "re-archive" without errors.
 *
 * Flow:
 *  1. Check if already archived (idempotent)
 *  2. Archive via scenarioRepo.archive
 *  3. Record audit log (best-effort)
 *  4. Return
 */

import { Result } from "@/domain/shared/Result";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface ArchiveSimulatorScenarioInput {
  id: string;
  actorId: string;
}

export type ArchiveSimulatorScenarioError =
  | { kind: "db_error"; message: string };

export type ArchiveSimulatorScenarioResult = Result<
  { wasAlreadyArchived: boolean },
  ArchiveSimulatorScenarioError
>;

export interface ArchiveSimulatorScenarioDeps {
  scenarioRepo: ISimulatorScenarioRepository;
  recordAuditLog: RecordAuditLog;
}

export class ArchiveSimulatorScenario {
  constructor(private readonly deps: ArchiveSimulatorScenarioDeps) {}

  async execute(
    input: ArchiveSimulatorScenarioInput,
  ): Promise<ArchiveSimulatorScenarioResult> {
    // Check if already archived (idempotent)
    const findResult = await this.deps.scenarioRepo.findById(input.id);
    if (!findResult.ok) {
      const msg =
        findResult.error.kind === "db_error"
          ? findResult.error.message
          : "Failed to fetch scenario";
      return Result.err({ kind: "db_error", message: msg ?? "Unknown error" });
    }
    const wasAlreadyArchived = findResult.value === null;

    if (!wasAlreadyArchived) {
      const archiveResult = await this.deps.scenarioRepo.archive(input.id);
      if (!archiveResult.ok) {
        return Result.err({
          kind: "db_error",
          message: archiveResult.error.kind === "db_error" ? archiveResult.error.message : "Failed to archive scenario",
        });
      }
    }

    // Audit log — best-effort
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "simulator.archived",
      targetType: "simulator_scenario",
      targetId: input.id,
      metadata: { wasAlreadyArchived },
    });

    return Result.ok({ wasAlreadyArchived });
  }
}
