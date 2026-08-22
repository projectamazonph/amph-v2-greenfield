/**
 * GetScenarioCalibration — read the calibration band map for one
 * (simulatorId, scenarioKey) pair.
 *
 * STORY-086: Simulator grader — instructor calibration ranges.
 *
 * Thin read pass-through over the calibration port. Returns the existing
 * calibration record (with its dimension bands) or null when no
 * calibration has ever been saved for that pair. The admin form renders
 * the empty state for the null branch and prefills the bands otherwise.
 */

import { Result } from "@/domain/shared/Result";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  SimulatorScenarioCalibration,
  SimulatorScenarioCalibrationError,
} from "@/domain/entities/SimulatorScenarioCalibration";
import type { ISimulatorScenarioCalibrationRepository } from "@/ports/repositories/ISimulatorScenarioCalibrationRepository";

export type GetScenarioCalibrationResult = Result<
  { calibration: SimulatorScenarioCalibration | null },
  SimulatorScenarioCalibrationError
>;

export interface GetScenarioCalibrationDeps {
  calibrationRepo: ISimulatorScenarioCalibrationRepository;
}

export class GetScenarioCalibration {
  constructor(private readonly deps: GetScenarioCalibrationDeps) {}

  async execute(
    simulatorId: SimulatorId,
    scenarioKey: string,
  ): Promise<GetScenarioCalibrationResult> {
    const found = await this.deps.calibrationRepo.findBySimulatorAndScenarioKey(
      simulatorId,
      scenarioKey,
    );
    if (!found.ok) {
      return found;
    }
    return Result.ok({ calibration: found.value });
  }
}
