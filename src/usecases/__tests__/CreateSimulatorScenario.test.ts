/**
 * CreateSimulatorScenario.test.ts — STORY-050b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreateSimulatorScenario } from "@/usecases/CreateSimulatorScenario";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    newId: () => `ale_${++n}`,
    paymentRef: () => "x",
    receiptNumber: () => "x",
  };
}

function makeRecordAuditLog(): RecordAuditLog {
  return new RecordAuditLog({
    auditLog: new InMemoryAuditLog(),
    idGen: makeIdGen(),
    clock: new FixedClock(new Date()),
  });
}

function makeInput(overrides: Partial<Parameters<typeof CreateSimulatorScenario.prototype.execute>[0]> = {}) {
  return {
    id: "s_new",
    simulatorId: "bid-elevator" as const,
    name: "New Scenario",
    description: "A test scenario",
    inputSchema: {},
    outputSchema: {},
    difficulty: "beginner" as const,
    estimatedMinutes: 15,
    actorId: "admin_1",
    ...overrides,
  };
}

describe("CreateSimulatorScenario", () => {
  let repo: InMemorySimulatorScenarioRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: CreateSimulatorScenario;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioRepository();
    recordAuditLog = makeRecordAuditLog();
    useCase = new CreateSimulatorScenario({ scenarioRepo: repo, recordAuditLog });
  });

  it("creates a scenario on the happy path", async () => {
    const r = await useCase.execute(makeInput({ id: "s1" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenario.id).toBe("s1");
    expect(r.value.scenario.simulatorId).toBe("bid-elevator");
  });

  it("returns invalid_simulator_id for bad simulatorId", async () => {
    const r = await useCase.execute(makeInput({ simulatorId: "bad-id" as never }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_simulator_id");
  });

  it("returns invalid_difficulty for bad difficulty", async () => {
    const r = await useCase.execute(makeInput({ difficulty: "expert" as never }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_difficulty");
  });

  it("returns id_conflict when the id already exists", async () => {
    await useCase.execute(makeInput({ id: "s1" }));
    const r = await useCase.execute(makeInput({ id: "s1" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("id_conflict");
  });

  it("records an audit log entry on success", async () => {
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    await useCase.execute(makeInput({ id: "s1", name: "Test" }));

    const entries = auditLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "simulator.created",
      targetType: "simulator_scenario",
      targetId: "s1",
    });
  });
});
