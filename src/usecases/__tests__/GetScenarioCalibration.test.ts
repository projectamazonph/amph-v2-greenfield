/**
 * GetScenarioCalibration.test.ts — STORY-086.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetScenarioCalibration } from "@/usecases/GetScenarioCalibration";
import { InMemorySimulatorScenarioCalibrationRepository } from "@/infra/repositories/inmemory/InMemorySimulatorScenarioCalibrationRepository";
import {
  createSimulatorScenarioCalibration,
  type SimulatorScenarioCalibration,
} from "@/domain/entities/SimulatorScenarioCalibration";

async function seedCalibration(
  repo: InMemorySimulatorScenarioCalibrationRepository,
  simulatorId: "bid-elevator" | "str-triage",
  scenarioKey: string,
): Promise<SimulatorScenarioCalibration> {
  const built = createSimulatorScenarioCalibration({
    id: `cal_${simulatorId}_${scenarioKey}`,
    simulatorId,
    scenarioKey,
    dimensionBands: {
      direction: { minScore: 40, maxScore: 90 },
    },
    instructorId: "admin_1",
    createdAt: new Date("2026-08-21T10:00:00Z"),
    updatedAt: new Date("2026-08-21T10:00:00Z"),
  });
  if (!built.ok) throw new Error("seed failed");
  await repo.upsert(built.value);
  return built.value;
}

describe("GetScenarioCalibration", () => {
  let repo: InMemorySimulatorScenarioCalibrationRepository;
  let useCase: GetScenarioCalibration;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioCalibrationRepository();
    useCase = new GetScenarioCalibration({ calibrationRepo: repo });
  });

  it("returns null when no calibration has been saved", async () => {
    const r = await useCase.execute("bid-elevator", "scenario-key-1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.calibration).toBeNull();
  });

  it("returns the saved calibration record when one exists", async () => {
    const seeded = await seedCalibration(repo, "bid-elevator", "scenario-key-1");
    const r = await useCase.execute("bid-elevator", "scenario-key-1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.calibration).toEqual(seeded);
  });

  it("isolates results per (simulatorId, scenarioKey) tuple", async () => {
    await seedCalibration(repo, "bid-elevator", "scenario-key-1");
    const other = await useCase.execute("bid-elevator", "scenario-key-other");
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(other.value.calibration).toBeNull();
  });

  it("returns ok with null for a different simulator on the same key", async () => {
    await seedCalibration(repo, "bid-elevator", "scenario-key-1");
    const other = await useCase.execute("str-triage", "scenario-key-1");
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(other.value.calibration).toBeNull();
  });
});
