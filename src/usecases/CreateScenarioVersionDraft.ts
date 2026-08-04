/**
 * CreateScenarioVersionDraft — admin creates a new draft version derived
 * from an existing scenario (draft, published, or archived).
 *
 * STORY-085.
 *
 * Flow:
 *  1. Find the source scenario (must exist)
 *  2. Derive a new draft: same scenarioKey, version + 1, new id
 *  3. Persist via scenarioRepo.create
 *  4. Record audit log (best-effort)
 *  5. Return the new draft
 */

import { Result } from "@/domain/shared/Result";
import { createDraftFromScenario } from "@/domain/entities/SimulatorScenario";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface CreateScenarioVersionDraftInput {
  sourceId: string;
  actorId: string;
}

export type CreateScenarioVersionDraftError =
  { kind: "scenario_not_found" } | { kind: "db_error"; message: string };

export type CreateScenarioVersionDraftResult = Result<
  { scenario: SimulatorScenario },
  CreateScenarioVersionDraftError
>;

export interface CreateScenarioVersionDraftDeps {
  scenarioRepo: ISimulatorScenarioRepository;
  recordAuditLog: RecordAuditLog;
  idGen: IdGenerator;
  clock: Clock;
}

export class CreateScenarioVersionDraft {
  constructor(private readonly deps: CreateScenarioVersionDraftDeps) {}

  async execute(input: CreateScenarioVersionDraftInput): Promise<CreateScenarioVersionDraftResult> {
    // ── 1. Find source ─────────────────────────────────────
    const findResult = await this.deps.scenarioRepo.findById(input.sourceId);
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

    // ── 2. Derive new draft ─────────────────────────────────
    const draft = createDraftFromScenario(
      findResult.value,
      this.deps.idGen.newId(),
      this.deps.clock.now(),
    );

    // ── 3. Persist ────────────────────────────────────────
    const persistResult = await this.deps.scenarioRepo.create(draft);
    if (!persistResult.ok) {
      return Result.err({
        kind: "db_error",
        message:
          persistResult.error.kind === "db_error"
            ? persistResult.error.message
            : "Failed to create draft",
      });
    }
    const scenario = persistResult.value;

    // ── 4. Audit log — best-effort ────────────────────────
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "simulator.draft_created",
      targetType: "simulator_scenario",
      targetId: scenario.id,
      metadata: {
        simulatorId: scenario.simulatorId,
        scenarioKey: scenario.scenarioKey,
        version: scenario.version,
        sourceId: input.sourceId,
      },
    });

    return Result.ok({ scenario });
  }
}
