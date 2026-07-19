/**
 * GetSimulatorScenario.test.ts — STORY-050b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetSimulatorScenario } from "@/usecases/GetSimulatorScenario";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";

function makeScenario(overrides: Partial<Parameters<typeof createSimulatorScenario>[0]> = {}) {
  const r = createSimulatorScenario({
    id: "s_test",
    simulatorId: "bid-elevator",
    name: "Test",
    description: "D",
    inputSchema: {},
    outputSchema: {},
    difficulty: "beginner",
    estimatedMinutes: 5,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("GetSimulatorScenario", () => {
  let repo: InMemorySimulatorScenarioRepository;
  let useCase: GetSimulatorScenario;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioRepository();
    useCase = new GetSimulatorScenario({ scenarioRepo: repo });
  });

  it("returns the scenario on the happy path", async () => {
    repo.seed(makeScenario({ id: "s1", name: "A" }));

    const r = await useCase.execute("s1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenario.id).toBe("s1");
    expect(r.value.scenario.name).toBe("A");
  });

  it("returns scenario_not_found when the scenario doesn't exist", async () => {
    const r = await useCase.execute("missing");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("scenario_not_found");
  });

  it("returns db_error when the repo errors", async () => {
    repo.findById = async () => ({
      ok: false,
      error: { kind: "db_error" as const, message: "store down" },
    });

    const r = await useCase.execute("s1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
