/**
 * PublishSimulatorScenario.test.ts — STORY-085.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PublishSimulatorScenario } from "@/usecases/PublishSimulatorScenario";
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

function makeScenario(
  overrides: Partial<{
    id: string;
    scenarioKey: string;
    version: number;
    status: "draft" | "published" | "archived";
  }> = {},
) {
  const r = createSimulatorScenario({
    id: overrides.id ?? "s1",
    scenarioKey: overrides.scenarioKey,
    version: overrides.version,
    simulatorId: "bid-elevator" as const,
    name: "Scenario",
    description: "D",
    inputSchema: {},
    outputSchema: {},
    difficulty: "beginner" as const,
    estimatedMinutes: 10,
  });
  if (!r.ok) throw new Error("seed failed");
  return overrides.status ? { ...r.value, status: overrides.status } : r.value;
}

describe("PublishSimulatorScenario", () => {
  let repo: InMemorySimulatorScenarioRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: PublishSimulatorScenario;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioRepository();
    recordAuditLog = makeRecordAuditLog();
    useCase = new PublishSimulatorScenario({ scenarioRepo: repo, recordAuditLog });
  });

  it("publishes a draft", async () => {
    repo.seed(makeScenario({ id: "s1" }));

    const r = await useCase.execute({ id: "s1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenario.status).toBe("published");
  });

  it("archives a previously-published sibling with the same scenarioKey", async () => {
    repo.seed(
      makeScenario({ id: "s1_v1", scenarioKey: "family", version: 1, status: "published" }),
    );
    repo.seed(makeScenario({ id: "s1_v2", scenarioKey: "family", version: 2 }));

    const r = await useCase.execute({ id: "s1_v2", actorId: "admin_1" });
    expect(r.ok).toBe(true);

    const oldResult = await repo.findById("s1_v1");
    expect(oldResult.ok && oldResult.value?.status).toBe("archived");
  });

  it("returns scenario_not_found for a missing id", async () => {
    const r = await useCase.execute({ id: "missing", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("scenario_not_found");
  });

  it("returns not_draft when the scenario is already published", async () => {
    repo.seed(makeScenario({ id: "s1", status: "published" }));

    const r = await useCase.execute({ id: "s1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_draft");
  });

  it("returns not_draft when the scenario is archived", async () => {
    repo.seed(makeScenario({ id: "s1", status: "archived" }));

    const r = await useCase.execute({ id: "s1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_draft");
  });

  it("records an audit log entry on success", async () => {
    repo.seed(makeScenario({ id: "s1" }));
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;

    await useCase.execute({ id: "s1", actorId: "admin_1" });

    const entries = auditLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "simulator.published",
      targetType: "simulator_scenario",
      targetId: "s1",
    });
  });
});
