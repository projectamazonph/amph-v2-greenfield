/**
 * SimulatorRegistry port — holds all registered simulators.
 *
 * STORY-036: Simulator infrastructure.
 *
 * All five simulators (bid-elevator, campaign-builder, listing-audit,
 * str-triage, keyword-research) are registered at startup.
 */

import type { Simulator } from "./Simulator";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";

export interface SimulatorRegistry {
  /**
   * Register a simulator. Idempotent — registering the same simulatorId twice
   * is a no-op.
   */
  register(simulator: Simulator<unknown, unknown>): void;

  /**
   * Get a simulator by its id. Returns null if not found.
   */
  get(id: SimulatorId): Simulator<unknown, unknown> | null;

  /**
   * List all registered simulators.
   */
  list(): readonly Simulator<unknown, unknown>[];
}
