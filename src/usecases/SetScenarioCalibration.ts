/**
 * SetScenarioCalibration — admin upserts the calibration band map for one
 * (simulatorId, scenarioKey) tuple.
 *
 * STORY-086: Simulator grader — instructor calibration ranges.
 *
 * Flow:
 *  1. Validate inputs via the entity factory
 *  2. Persist via calibrationRepo.upsert
 *  3. Record audit log (best-effort)
 *  4. Return the persisted calibration
 *
 * Calibration is additive to the umbrella ScorePolicy; this use case does
 * NOT touch ScorePolicy. The grading pipeline reads the calibration
 * alongside the policy and clamps out-of-band scores via
 * `mergeCalibrationIntoScores`.
 */

import { Result } from "@/domain/shared/Result";
import {
  createSimulatorScenarioCalibration,
  type CalibrationDimensionBand,
  type SimulatorScenarioCalibration,
} from "@/domain/entities/SimulatorScenarioCalibration";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { ISimulatorScenarioCalibrationRepository } from "@/ports/repositories/ISimulatorScenarioCalibrationRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface SetScenarioCalibrationInput {
  simulatorId: SimulatorId;
  scenarioKey: string;
  dimensionBands: Record<string, CalibrationDimensionBand>;
  instructorId: string;
}

export type SetScenarioCalibrationError =
  | { kind: "invalid_scenario_key" }
  | { kind: "unknown_dimension"; dimension: string }
  | { kind: "invalid_band"; dimension: string; reason: string }
  | { kind: "db_error"; message: string };

export interface SetScenarioCalibrationDeps {
  calibrationRepo: ISimulatorScenarioCalibrationRepository;
  recordAuditLog: RecordAuditLog;
  idGen: IdGenerator;
  clock: Clock;
}

export class SetScenarioCalibration {
  constructor(private readonly deps: SetScenarioCalibrationDeps) {}

  async execute(
    input: SetScenarioCalibrationInput,
  ): Promise<Result<SimulatorScenarioCalibration, SetScenarioCalibrationError>> {
    const now = this.deps.clock.now();
    const id = this.deps.idGen.newId();

    // ── 1. Validate via entity factory ──────────────────────────
    const buildResult = createSimulatorScenarioCalibration({
      id,
      simulatorId: input.simulatorId,
      scenarioKey: input.scenarioKey,
      dimensionBands: input.dimensionBands,
      instructorId: input.instructorId,
      createdAt: now,
      updatedAt: now,
    });
    if (!buildResult.ok) {
      const err = buildResult.error;
      if (err.kind === "invalid_scenario_key") {
        return Result.err({ kind: "invalid_scenario_key" });
      }
      if (err.kind === "unknown_dimension") {
        return Result.err({ kind: "unknown_dimension", dimension: err.dimension });
      }
      if (err.kind === "invalid_band") {
        return Result.err({ kind: "invalid_band", dimension: err.dimension, reason: err.reason });
      }
      // invalid_simulator_id is unreachable from a typed `SimulatorId`
      // input, but the factory surfaces it as a defence-in-depth branch.
      // Fall through with a generic db_error so the build stays sound.
      return Result.err({ kind: "db_error", message: "Invalid calibration input" });
    }
    const calibration = buildResult.value;

    // ── 2. Persist ─────────────────────────────────────────────
    const persistResult = await this.deps.calibrationRepo.upsert(calibration);
    if (!persistResult.ok) {
      return Result.err({
        kind: "db_error",
        message: persistResult.error.kind === "invalid_band" ? persistResult.error.reason : "Failed to upsert calibration",
      });
    }

    // ── 3. Audit log — best-effort ─────────────────────────────
    await this.deps.recordAuditLog.execute({
      actorId: input.instructorId,
      action: "simulator_calibration.set",
      targetType: "simulator_scenario_calibration",
      targetId: `${calibration.simulatorId}::${calibration.scenarioKey}`,
      metadata: {
        simulatorId: calibration.simulatorId,
        scenarioKey: calibration.scenarioKey,
        bandCount: Object.keys(calibration.dimensionBands).length,
      },
    });

    return Result.ok(calibration);
  }
}
