/**
 * SimulatorScenario entity tests — TDD (red first).
 *
 * STORY-036: Simulator infrastructure.
 */

import { describe, it, expect } from "vitest";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type { SimulatorScenario, SimulatorId } from "@/domain/entities/SimulatorScenario";

const NOW = new Date("2025-07-01T00:00:00Z");

describe("SimulatorScenario", () => {
  it("creates a valid scenario with all fields", () => {
    const result = createSimulatorScenario({
      id: "scenario_01",
      simulatorId: "bid-elevator",
      name: "Bid Elevator — ROAS Target 3x",
      description: "Adjust keyword bids to hit a 3x ROAS target within budget.",
      inputSchema: {
        type: "object",
        properties: {
          keywords: { type: "array", items: { type: "string" } },
          budget: { type: "number" },
          targetRoas: { type: "number" },
        },
        required: ["keywords", "budget", "targetRoas"],
      },
      outputSchema: {
        type: "object",
        properties: {
          bids: { type: "array", items: { type: "number" } },
          estimatedRoas: { type: "number" },
          spend: { type: "number" },
        },
      },
      difficulty: "intermediate",
      estimatedMinutes: 15,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const scenario: SimulatorScenario = result.value;
    expect(scenario.id).toBe("scenario_01");
    expect(scenario.simulatorId).toBe("bid-elevator");
    expect(scenario.name).toBe("Bid Elevator — ROAS Target 3x");
    expect(scenario.difficulty).toBe("intermediate");
    expect(scenario.estimatedMinutes).toBe(15);
  });

  it("returns invalid_simulator_id for an unknown simulatorId", () => {
    const result = createSimulatorScenario({
      id: "scenario_02",
      simulatorId: "not-a-simulator",
      name: "Fake Simulator",
      description: "This should fail.",
      inputSchema: {},
      outputSchema: {},
      difficulty: "beginner",
      estimatedMinutes: 10,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_simulator_id");
  });

  it("returns invalid_difficulty for an unknown difficulty", () => {
    const result = createSimulatorScenario({
      id: "scenario_03",
      simulatorId: "bid-elevator",
      name: "Test",
      description: "Test",
      inputSchema: {},
      outputSchema: {},
      difficulty: "expert",
      estimatedMinutes: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_difficulty");
  });
});
