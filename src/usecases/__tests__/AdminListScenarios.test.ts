/**
 * AdminListScenarios.test.ts — STORY-050b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminListScenarios } from "@/usecases/AdminListScenarios";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";

function makeScenario(overrides: Partial<Parameters<typeof createSimulatorScenario>[0]> = {}) {
  const r = createSimulatorScenario({
    id: `scenario_${Math.random().toString(36).slice(2, 8)}`,
    simulatorId: "bid-elevator",
    name: "Scenario A",
    description: "Desc",
    inputSchema: {},
    outputSchema: {},
    difficulty: "beginner",
    estimatedMinutes: 10,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed: " + JSON.stringify(r.error));
  return r.value;
}

describe("AdminListScenarios", () => {
  let repo: InMemorySimulatorScenarioRepository;
  let useCase: AdminListScenarios;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioRepository();
    useCase = new AdminListScenarios({ scenarioRepo: repo });
  });

  it("returns empty array when no scenarios", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenarios).toEqual([]);
  });

  it("returns all scenarios on the happy path", async () => {
    repo.seed(makeScenario({ id: "s1", name: "A" }));
    repo.seed(makeScenario({ id: "s2", name: "B" }));

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenarios).toHaveLength(2);
  });

  it("filters by simulatorId", async () => {
    repo.seed(makeScenario({ id: "s1", simulatorId: "bid-elevator", name: "A" }));
    repo.seed(makeScenario({ id: "s2", simulatorId: "str-triage", name: "B" }));
    repo.seed(makeScenario({ id: "s3", simulatorId: "bid-elevator", name: "C" }));

    const r = await useCase.execute({ simulatorId: "bid-elevator" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenarios).toHaveLength(2);
    expect(r.value.scenarios.every((s) => s.simulatorId === "bid-elevator")).toBe(true);
  });

  it("excludes archived scenarios", async () => {
    repo.seed(makeScenario({ id: "s1", name: "A" }));
    repo.seed(makeScenario({ id: "s2", name: "B" }));
    await repo.archive("s1");

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenarios).toHaveLength(1);
    expect(r.value.scenarios[0]?.id).toBe("s2");
  });

  it("returns db_error when the repo errors", async () => {
    // Override listAll to return db_error
    repo.listAll = async () => ({
      ok: false,
      error: { kind: "db_error" as const, message: "store down" },
    });

    const r = await useCase.execute();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
