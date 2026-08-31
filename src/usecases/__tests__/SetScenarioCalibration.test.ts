/**
 * SetScenarioCalibration.test.ts — STORY-086.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SetScenarioCalibration } from "@/usecases/SetScenarioCalibration";
import { InMemorySimulatorScenarioCalibrationRepository } from "@/infra/repositories/inmemory/InMemorySimulatorScenarioCalibrationRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    newId: () => `cal_${++n}`,
    paymentRef: () => "x",
    receiptNumber: () => "x",
  };
}

function makeRecordAuditLog(): { useCase: RecordAuditLog; auditLog: InMemoryAuditLog } {
  const auditLog = new InMemoryAuditLog();
  const useCase = new RecordAuditLog({
    auditLog,
    idGen: makeIdGen(),
    clock: new FixedClock(new Date("2026-08-21T10:00:00Z")),
    logger: new SilentLogger(),
  });
  return { useCase, auditLog };
}

function makeInput(overrides: Partial<Parameters<SetScenarioCalibration["execute"]>[0]> = {}) {
  return {
    simulatorId: "bid-elevator" as const,
    scenarioKey: "scenario-key-1",
    dimensionBands: {
      direction: { minScore: 40, maxScore: 90 },
      profitability: { minScore: 30, maxScore: 80 },
    },
    instructorId: "admin_1",
    ...overrides,
  };
}

describe("SetScenarioCalibration", () => {
  let repo: InMemorySimulatorScenarioCalibrationRepository;
  let recordAuditLog: RecordAuditLog;
  let auditLog: InMemoryAuditLog;
  let useCase: SetScenarioCalibration;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioCalibrationRepository();
    const wrapped = makeRecordAuditLog();
    recordAuditLog = wrapped.useCase;
    auditLog = wrapped.auditLog;
    useCase = new SetScenarioCalibration({
      calibrationRepo: repo,
      recordAuditLog,
      idGen: makeIdGen(),
      clock: new FixedClock(new Date("2026-08-21T10:00:00Z")),
    });
  });

  it("creates a calibration on the happy path", async () => {
    const r = await useCase.execute(makeInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.simulatorId).toBe("bid-elevator");
    expect(r.value.scenarioKey).toBe("scenario-key-1");
    expect(r.value.dimensionBands.direction).toEqual({ minScore: 40, maxScore: 90 });
    expect(r.value.instructorId).toBe("admin_1");
  });

  it("rejects an empty scenarioKey", async () => {
    const r = await useCase.execute(makeInput({ scenarioKey: "   " }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_scenario_key");
  });

  it("rejects a band that spans the full numeric range", async () => {
    const r = await useCase.execute(
      makeInput({
        dimensionBands: {
          direction: { minScore: 0, maxScore: 100 },
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_band");
  });

  it("rejects an inverted band (min >= max)", async () => {
    const r = await useCase.execute(
      makeInput({
        dimensionBands: {
          direction: { minScore: 80, maxScore: 40 },
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_band");
  });

  it("rejects an unknown dimension key", async () => {
    const r = await useCase.execute(
      makeInput({
        dimensionBands: {
          not_a_real_dimension: { minScore: 10, maxScore: 50 },
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("unknown_dimension");
    expect(r.error.kind === "unknown_dimension" && r.error.dimension).toBe("not_a_real_dimension");
  });

  it("upserts: a second call with the same key replaces the band map", async () => {
    await useCase.execute(
      makeInput({ dimensionBands: { direction: { minScore: 40, maxScore: 90 } } }),
    );
    const r = await useCase.execute(
      makeInput({ dimensionBands: { profitability: { minScore: 50, maxScore: 95 } } }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const stored = await repo.findBySimulatorAndScenarioKey("bid-elevator", "scenario-key-1");
    expect(stored.ok).toBe(true);
    if (!stored.ok || stored.value === null) return;
    expect(Object.keys(stored.value.dimensionBands)).toEqual(["profitability"]);
    expect(stored.value.dimensionBands.direction).toBeUndefined();
  });

  it("records an audit log entry with the (simulatorId, scenarioKey) target id", async () => {
    await useCase.execute(makeInput());
    const entries = auditLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "simulator_calibration.set",
      targetType: "simulator_scenario_calibration",
      targetId: "bid-elevator::scenario-key-1",
      actorId: "admin_1",
    });
  });

  it("does not record an audit log when validation fails", async () => {
    await useCase.execute(makeInput({ scenarioKey: "" }));
    expect(auditLog.getAll()).toHaveLength(0);
  });
});
