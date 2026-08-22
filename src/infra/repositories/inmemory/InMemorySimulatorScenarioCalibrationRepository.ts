/**
 * InMemorySimulatorScenarioCalibrationRepository — in-memory test adapter
 * for `ISimulatorScenarioCalibrationRepository`.
 *
 * STORY-086: Simulator grader — instructor calibration ranges.
 *
 * Lives in `src/infra/repositories/inmemory/` next to the other test
 * doubles. Matches the production contract (upsert is idempotent on the
 * (simulatorId, scenarioKey) tuple, find returns a copy or null).
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  SimulatorScenarioCalibration,
  SimulatorScenarioCalibrationError,
} from "@/domain/entities/SimulatorScenarioCalibration";
import type { ISimulatorScenarioCalibrationRepository } from "@/ports/repositories/ISimulatorScenarioCalibrationRepository";
import { Result } from "@/domain/shared/Result";

export class InMemorySimulatorScenarioCalibrationRepository
  implements ISimulatorScenarioCalibrationRepository
{
  private readonly store = new Map<string, SimulatorScenarioCalibration>();

  private key(simulatorId: SimulatorId, scenarioKey: string): string {
    return `${simulatorId}::${scenarioKey}`;
  }

  async findBySimulatorAndScenarioKey(
    simulatorId: SimulatorId,
    scenarioKey: string,
  ): Promise<
    Result<SimulatorScenarioCalibration | null, SimulatorScenarioCalibrationError>
  > {
    const found = this.store.get(this.key(simulatorId, scenarioKey));
    // Return a shallow copy so callers cannot mutate in-memory state.
    return Result.ok(found ? { ...found, dimensionBands: { ...found.dimensionBands } } : null);
  }

  async upsert(
    calibration: SimulatorScenarioCalibration,
  ): Promise<Result<void, SimulatorScenarioCalibrationError>> {
    this.store.set(this.key(calibration.simulatorId, calibration.scenarioKey), {
      ...calibration,
      dimensionBands: { ...calibration.dimensionBands },
    });
    return Result.ok(undefined);
  }
}
