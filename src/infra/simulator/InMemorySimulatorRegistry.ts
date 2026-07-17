/**
 * InMemorySimulatorRegistry — simple Map-based registry for simulators.
 *
 * STORY-036: Simulator infrastructure.
 *
 * Used in tests and as the dev/prod adapter (all simulator state lives
 * in-process for now; persistence can be added in a future story if needed).
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { SimulatorRegistry } from "@/ports/simulator/SimulatorRegistry";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";

export class InMemorySimulatorRegistry implements SimulatorRegistry {
  private readonly simulators = new Map<SimulatorId, Simulator<unknown, unknown>>();

  register(simulator: Simulator<unknown, unknown>): void {
    if (this.simulators.has(simulator.simulatorId)) return; // idempotent
    this.simulators.set(simulator.simulatorId, simulator);
  }

  get(id: SimulatorId): Simulator<unknown, unknown> | null {
    return this.simulators.get(id) ?? null;
  }

  list(): readonly Simulator<unknown, unknown>[] {
    return Array.from(this.simulators.values());
  }
}
