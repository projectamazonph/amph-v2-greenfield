/**
 * SimulatorScenario entity tests — TDD (red first).
 *
 * STORY-036: Simulator infrastructure.
 */

import { describe, it, expect } from "vitest";
import {
  createSimulatorScenario,
  publishScenario,
  createDraftFromScenario,
  archiveScenario,
} from "@/domain/entities/SimulatorScenario";
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

  // ── STORY-085: publishing + versioning ────────────────────────────────

  function makeDraft(overrides: Partial<Parameters<typeof createSimulatorScenario>[0]> = {}) {
    const result = createSimulatorScenario({
      id: "scenario_01",
      simulatorId: "bid-elevator",
      name: "Bid Elevator — default",
      description: "desc",
      inputSchema: {},
      outputSchema: {},
      difficulty: "intermediate",
      estimatedMinutes: 10,
      now: NOW,
      ...overrides,
    });
    if (!result.ok) throw new Error("fixture failed");
    return result.value;
  }

  describe("createSimulatorScenario defaults", () => {
    it("defaults scenarioKey to id, version to 1, and status to draft", () => {
      const scenario = makeDraft();
      expect(scenario.scenarioKey).toBe("scenario_01");
      expect(scenario.version).toBe(1);
      expect(scenario.status).toBe("draft");
      expect(scenario.createdAt).toEqual(NOW);
      expect(scenario.updatedAt).toEqual(NOW);
    });

    it("accepts an explicit scenarioKey and version", () => {
      const scenario = makeDraft({ scenarioKey: "bid-elevator-default", version: 3 });
      expect(scenario.scenarioKey).toBe("bid-elevator-default");
      expect(scenario.version).toBe(3);
    });
  });

  describe("publishScenario", () => {
    it("transitions a draft to published", () => {
      const draft = makeDraft();
      const published = new Date("2025-07-02T00:00:00Z");
      const result = publishScenario(draft, published);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("published");
      expect(result.value.updatedAt).toEqual(published);
      // Identity fields preserved
      expect(result.value.id).toBe(draft.id);
      expect(result.value.scenarioKey).toBe(draft.scenarioKey);
      expect(result.value.version).toBe(draft.version);
    });

    it("returns not_draft when the scenario is already published", () => {
      const draft = makeDraft();
      const publishResult = publishScenario(draft);
      if (!publishResult.ok) throw new Error("fixture failed");
      const result = publishScenario(publishResult.value);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_draft");
    });

    it("returns not_draft when the scenario is archived", () => {
      const draft = makeDraft();
      const archived = archiveScenario(draft);
      const result = publishScenario(archived);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_draft");
    });
  });

  describe("createDraftFromScenario", () => {
    it("clones the source into a new draft, one version ahead, same scenarioKey", () => {
      const draft = makeDraft({ scenarioKey: "bid-elevator-default", version: 1 });
      const publishResult = publishScenario(draft, NOW);
      if (!publishResult.ok) throw new Error("fixture failed");
      const published = publishResult.value;

      const now2 = new Date("2025-08-01T00:00:00Z");
      const newDraft = createDraftFromScenario(published, "scenario_02", now2);

      expect(newDraft.id).toBe("scenario_02");
      expect(newDraft.scenarioKey).toBe("bid-elevator-default");
      expect(newDraft.version).toBe(2);
      expect(newDraft.status).toBe("draft");
      expect(newDraft.createdAt).toEqual(now2);
      expect(newDraft.updatedAt).toEqual(now2);
      // Content copied through
      expect(newDraft.name).toBe(published.name);
      expect(newDraft.simulatorId).toBe(published.simulatorId);
    });
  });

  describe("archiveScenario", () => {
    it("sets status to archived and stamps updatedAt", () => {
      const draft = makeDraft();
      const now2 = new Date("2025-09-01T00:00:00Z");
      const archived = archiveScenario(draft, now2);
      expect(archived.status).toBe("archived");
      expect(archived.updatedAt).toEqual(now2);
      expect(archived.id).toBe(draft.id);
    });
  });
});
