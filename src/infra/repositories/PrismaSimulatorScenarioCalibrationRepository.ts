/**
 * PrismaSimulatorScenarioCalibrationRepository — Postgres-backed persistence
 * for instructor calibration bands.
 *
 * STORY-086: Simulator grader — instructor calibration ranges.
 *
 * Mirrors the InMemory adapter's contract: `findBySimulatorAndScenarioKey`
 * returns null when no calibration has been recorded; `upsert` replaces
 * the existing row for the (simulatorId, scenarioKey) tuple in one
 * statement.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  CalibrationDimensionBand,
  SimulatorScenarioCalibration,
  SimulatorScenarioCalibrationError,
} from "@/domain/entities/SimulatorScenarioCalibration";
import type { ISimulatorScenarioCalibrationRepository } from "@/ports/repositories/ISimulatorScenarioCalibrationRepository";
import { hydrateSimulatorScenarioCalibration } from "@/domain/entities/SimulatorScenarioCalibration";
import { Result } from "@/domain/shared/Result";

type DimensionBandMap = Record<string, CalibrationDimensionBand>;

function toDomain(raw: {
  id: string;
  simulatorId: string;
  scenarioKey: string;
  dimensionBands: Prisma.JsonValue;
  instructorId: string;
  createdAt: Date;
  updatedAt: Date;
}): SimulatorScenarioCalibration {
  return hydrateSimulatorScenarioCalibration({
    id: raw.id,
    simulatorId: raw.simulatorId as SimulatorId,
    scenarioKey: raw.scenarioKey,
    dimensionBands: raw.dimensionBands as unknown as DimensionBandMap,
    instructorId: raw.instructorId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

function toError(message: string): SimulatorScenarioCalibrationError {
  return { kind: "invalid_band", dimension: "(repository)", reason: message };
}

export class PrismaSimulatorScenarioCalibrationRepository
  implements ISimulatorScenarioCalibrationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async findBySimulatorAndScenarioKey(
    simulatorId: SimulatorId,
    scenarioKey: string,
  ): Promise<
    Result<SimulatorScenarioCalibration | null, SimulatorScenarioCalibrationError>
  > {
    try {
      const raw = await this.prisma.simulatorScenarioCalibration.findUnique({
        where: {
          simulatorId_scenarioKey: {
            simulatorId,
            scenarioKey,
          },
        },
      });
      if (!raw) return Result.ok(null);
      return Result.ok(toDomain(raw));
    } catch (err: unknown) {
      return Result.err(toError(err instanceof Error ? err.message : String(err)));
    }
  }

  async upsert(
    calibration: SimulatorScenarioCalibration,
  ): Promise<Result<void, SimulatorScenarioCalibrationError>> {
    try {
      await this.prisma.simulatorScenarioCalibration.upsert({
        where: {
          simulatorId_scenarioKey: {
            simulatorId: calibration.simulatorId,
            scenarioKey: calibration.scenarioKey,
          },
        },
        create: {
          id: calibration.id,
          simulatorId: calibration.simulatorId,
          scenarioKey: calibration.scenarioKey,
          dimensionBands: calibration.dimensionBands as unknown as Prisma.InputJsonValue,
          instructorId: calibration.instructorId,
          createdAt: calibration.createdAt,
          updatedAt: calibration.updatedAt,
        },
        update: {
          dimensionBands: calibration.dimensionBands as unknown as Prisma.InputJsonValue,
          instructorId: calibration.instructorId,
          updatedAt: calibration.updatedAt,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err(toError(err instanceof Error ? err.message : String(err)));
    }
  }
}
