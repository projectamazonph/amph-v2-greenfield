/**
 * CreateScenarioVersionDraft.test.ts — STORY-085.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreateScenarioVersionDraft } from "@/usecases/CreateScenarioVersionDraft";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function makeIdGen(prefix = "draft"): IdGenerator {
  let n = 0;
  return { newId: () => `${prefix}_${++n}`, paymentRef: () => "x", receiptNumber: () => "x" };
}

function makeRecordAuditLog(): RecordAuditLog {
  return new RecordAuditLog({
    auditLog: new InMemoryAuditLog(),
    idGen: makeIdGen("audit"),
    clock: new FixedClock(new Date()),
    logger: new SilentLogger(),
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
    inputSchema: { a: 1 },
    outputSchema: {},
    difficulty: "beginner" as const,
    estimatedMinutes: 10,
  });
  if (!r.ok) throw new Error("seed failed");
  return overrides.status ? { ...r.value, status: overrides.status } : r.value;
}

describe("CreateScenarioVersionDraft", () => {
  let repo: InMemorySimulatorScenarioRepository;
  let recordAuditLog: RecordAuditLog;
  let idGen: IdGenerator;
  let useCase: CreateScenarioVersionDraft;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioRepository();
    recordAuditLog = makeRecordAuditLog();
    idGen = makeIdGen();
    useCase = new CreateScenarioVersionDraft({
      scenarioRepo: repo,
      recordAuditLog,
      idGen,
      clock: new FixedClock(new Date("2026-08-04T00:00:00Z")),
    });
  });

  it("derives a new draft from a published source", async () => {
    repo.seed(makeScenario({ id: "s1", scenarioKey: "family", version: 1, status: "published" }));

    const r = await useCase.execute({ sourceId: "s1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenario.id).not.toBe("s1");
    expect(r.value.scenario.scenarioKey).toBe("family");
    expect(r.value.scenario.version).toBe(2);
    expect(r.value.scenario.status).toBe("draft");
    expect(r.value.scenario.inputSchema).toEqual({ a: 1 });
  });

  it("derives a new draft from an archived source", async () => {
    repo.seed(makeScenario({ id: "s1", scenarioKey: "family", version: 3, status: "archived" }));

    const r = await useCase.execute({ sourceId: "s1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenario.version).toBe(4);
    expect(r.value.scenario.status).toBe("draft");
  });

  it("returns scenario_not_found for a missing source", async () => {
    const r = await useCase.execute({ sourceId: "missing", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("scenario_not_found");
  });

  it("records an audit log entry on success", async () => {
    repo.seed(makeScenario({ id: "s1" }));
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;

    await useCase.execute({ sourceId: "s1", actorId: "admin_1" });

    const entries = auditLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "simulator.draft_created",
      targetType: "simulator_scenario",
    });
  });
});
