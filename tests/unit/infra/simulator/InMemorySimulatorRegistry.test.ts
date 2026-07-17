/**
 * InMemorySimulatorRegistry tests — TDD (red first).
 *
 * STORY-036: Simulator infrastructure.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySimulatorRegistry } from "@/infra/simulator/InMemorySimulatorRegistry";
import { StubSimulator } from "@/infra/simulator/StubSimulator";
import type { Simulator } from "@/ports/simulator/Simulator";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";

describe("InMemorySimulatorRegistry", () => {
  let registry: InMemorySimulatorRegistry;

  beforeEach(() => {
    registry = new InMemorySimulatorRegistry();
  });

  it("starts empty", () => {
    expect(registry.list()).toHaveLength(0);
    expect(registry.get("bid-elevator")).toBeNull();
  });

  it("registers and retrieves a simulator by id", () => {
    const sim: Simulator<unknown, unknown> = new StubSimulator({
      simulatorId: "bid-elevator",
      name: "Bid Elevator",
    });
    registry.register(sim);

    expect(registry.list()).toHaveLength(1);
    expect(registry.get("bid-elevator")).toBe(sim);
  });

  it("lists all registered simulators", () => {
    const sim1: Simulator<unknown, unknown> = new StubSimulator({
      simulatorId: "bid-elevator",
      name: "Bid Elevator",
    });
    const sim2: Simulator<unknown, unknown> = new StubSimulator({
      simulatorId: "str-triage",
      name: "STR Triage",
    });
    registry.register(sim1);
    registry.register(sim2);

    expect(registry.list()).toHaveLength(2);
  });

  it("returns null for an unknown simulator id", () => {
    expect(registry.get("nonexistent" as SimulatorId)).toBeNull();
  });

  it("does not duplicate a simulator registered twice", () => {
    const sim: Simulator<unknown, unknown> = new StubSimulator({
      simulatorId: "bid-elevator",
      name: "Bid Elevator",
    });
    registry.register(sim);
    registry.register(sim);

    expect(registry.list()).toHaveLength(1);
  });
});
