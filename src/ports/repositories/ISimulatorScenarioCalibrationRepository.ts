/**
 * ISimulatorScenarioCalibrationRepository — port for persisting instructor
 * calibration bands for a simulator scenario.
 *
 * STORY-086: Simulator grader — instructor calibration ranges.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  SimulatorScenarioCalibration,
  SimulatorScenarioCalibrationError,
} from "@/domain/entities/SimulatorScenarioCalibration";
import { Result } from "@/domain/shared/Result";

export interface ISimulatorScenarioCalibrationRepository {
  /**
   * Find the calibration for one (simulatorId, scenarioKey) pair.
   * Returns null when no calibration has been saved for that pair.
   */
  findBySimulatorAndScenarioKey(
    simulatorId: SimulatorId,
    scenarioKey: string,
  ): Promise<
    Result<SimulatorScenarioCalibration | null, SimulatorScenarioCalibrationError>
  >;

  /**
   * Persist a calibration, replacing any existing record for the
   * (simulatorId, scenarioKey) pair. The factory has already validated
   * the supplied bands, so the adapter does not revalidate on write.
   */
  upsert(
    calibration: SimulatorScenarioCalibration,
  ): Promise<Result<void, SimulatorScenarioCalibrationError>>;
}
