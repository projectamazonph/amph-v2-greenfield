/**
 * ArchiveSimulatorScenario.test.ts — STORY-050b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ArchiveSimulatorScenario } from "@/usecases/ArchiveSimulatorScenario";
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

function makeScenario(id = "s1") {
  const r = createSimulatorScenario({
    id,
    simulatorId: "bid-elevator" as const,
    name: "Test",
    description: "D",
    inputSchema: {},
    outputSchema: {},
    difficulty: "beginner",
    estimatedMinutes: 10,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("ArchiveSimulatorScenario", () => {
  let repo: InMemorySimulatorScenarioRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: ArchiveSimulatorScenario;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioRepository();
    recordAuditLog = makeRecordAuditLog();
    useCase = new ArchiveSimulatorScenario({ scenarioRepo: repo, recordAuditLog });
  });

  it("archives a scenario on the happy path", async () => {
    repo.seed(makeScenario("s1"));

    const r = await useCase.execute({ id: "s1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.wasAlreadyArchived).toBe(false);
  });

  it("is idempotent on a missing scenario", async () => {
    const r = await useCase.execute({ id: "missing", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.wasAlreadyArchived).toBe(true);
  });

  it("records an audit log entry even on idempotent call", async () => {
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;

    await useCase.execute({ id: "missing", actorId: "admin_1" });

    const entries = auditLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "simulator.archived",
      targetType: "simulator_scenario",
      targetId: "missing",
      metadata: { wasAlreadyArchived: true },
    });
  });
});
