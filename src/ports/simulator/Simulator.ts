/**
 * Simulator port — the interface all Amazon PPC simulators implement.
 *
 * STORY-036: Simulator infrastructure.
 *
 * Each simulator is typed with its input/output shapes so callers get
 * full type-safety without a shared schema.
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";

/**
 * A single simulator. Implementations (StubSimulator, future real ones)
 * are registered in the SimulatorRegistry.
 */
export interface Simulator<TIn, TOut> {
  /** Stable identifier — e.g. "bid-elevator" */
  readonly simulatorId: SimulatorId;

  /** Human-readable name shown in the UI */
  readonly name: string;

  /** Run the simulator with the given input. */
  run(input: TIn): Promise<TOut>;
}
