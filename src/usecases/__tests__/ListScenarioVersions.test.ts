/**
 * ListScenarioVersions.test.ts — STORY-085.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ListScenarioVersions } from "@/usecases/ListScenarioVersions";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";

function makeScenario(
  overrides: Partial<{
    id: string;
    scenarioKey: string;
    version: number;
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
  return r.value;
}

describe("ListScenarioVersions", () => {
  let repo: InMemorySimulatorScenarioRepository;
  let useCase: ListScenarioVersions;

  beforeEach(() => {
    repo = new InMemorySimulatorScenarioRepository();
    useCase = new ListScenarioVersions({ scenarioRepo: repo });
  });

  it("returns every version sharing a scenarioKey, newest first", async () => {
    repo.seed(makeScenario({ id: "v1", scenarioKey: "family", version: 1 }));
    repo.seed(makeScenario({ id: "v2", scenarioKey: "family", version: 2 }));
    repo.seed(makeScenario({ id: "other", scenarioKey: "other-family", version: 1 }));

    const r = await useCase.execute({ scenarioKey: "family" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.versions.map((v) => v.id)).toEqual(["v2", "v1"]);
  });

  it("returns an empty array for an unknown scenarioKey", async () => {
    const r = await useCase.execute({ scenarioKey: "nope" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.versions).toEqual([]);
  });
});
