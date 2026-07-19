/**
 * UpdateSimulatorScenario.test.ts — STORY-050b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UpdateSimulatorScenario } from "@/usecases/UpdateSimulatorScenario";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";

function makeIdGen(): IdGenerator {
  let n = 0;
  return { newId: () => `ale_${++n}`, paymentRef: () => "x", receiptNumber: () => "x" };
}

function makeRecordAuditLog(): RecordAuditLog {
  return new RecordAuditLog({
    auditLog: new InMemoryAuditLog(),
    idGen: makeIdGen(),
    clock: new FixedClock(new Date()),
  });
}

function makeScenario(overrides: Partial<{
  id: string; simulatorId: string; name: string; difficulty: string; estimatedMinutes: number;
}> = {}) {
  const r = createSimulatorScenario({
    id: "s1",
    simulatorId: "bid-elevator" as const,
    name: "Original",
    description: "D",
    inputSchema: {},
    outputSchema: {},
    difficulty: "beginner" as const,
    estimatedMinutes: 10,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

function makeInput(id: string, overrides: Partial<Parameters<typeof UpdateSimulatorScenario.prototype.execute>[0]> = {}) {
  return {
    id,
    simulatorId: "bid-elevator" as const,
    name: "Updated",
    description: "D",
    inputSchema: {},
    outputSchema: {},
    difficulty: "intermediate" as const,
    estimatedMinutes: 20,
    actorId: "admin_1",
    ...overrides,
  };
}

describe("UpdateSimulatorScenario", () => {
  let repo: InMemorySimulatorScenarioRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: UpdateSimulatorScenario;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioRepository();
    recordAuditLog = makeRecordAuditLog();
    useCase = new UpdateSimulatorScenario({ scenarioRepo: repo, recordAuditLog });
  });

  it("updates a scenario on the happy path", async () => {
    repo.seed(makeScenario({ id: "s1" }));

    const r = await useCase.execute(makeInput("s1"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenario.name).toBe("Updated");
    expect(r.value.scenario.difficulty).toBe("intermediate");
  });

  it("returns scenario_not_found when the scenario doesn't exist", async () => {
    const r = await useCase.execute(makeInput("missing"));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("scenario_not_found");
  });

  it("returns invalid_simulator_id for bad simulatorId", async () => {
    repo.seed(makeScenario());
    const r = await useCase.execute(makeInput("s1", { simulatorId: "bad" as never }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_simulator_id");
  });

  it("returns invalid_difficulty for bad difficulty", async () => {
    repo.seed(makeScenario());
    const r = await useCase.execute(makeInput("s1", { difficulty: "expert" as never }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_difficulty");
  });

  it("records an audit log entry on success", async () => {
    repo.seed(makeScenario({ id: "s1" }));
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;

    await useCase.execute(makeInput("s1"));

    const entries = auditLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "simulator.updated",
      targetType: "simulator_scenario",
      targetId: "s1",
    });
  });
});
