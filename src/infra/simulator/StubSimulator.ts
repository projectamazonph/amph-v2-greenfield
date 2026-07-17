/**
 * StubSimulator — placeholder for all four planned simulators.
 *
 * STORY-036: Simulator infrastructure.
 *
 * Each stub throws "Not implemented yet" when run(). Future stories
 * (STORY-037+) replace these with real implementations without touching
 * the registry or interface.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";

const NOT_IMPLEMENTED =
  "Not implemented yet — see STORY-037+ for the real simulator implementation.";

export interface StubSimulatorOptions {
  simulatorId: SimulatorId;
  name: string;
}

export class StubSimulator<TIn, TOut> implements Simulator<TIn, TOut> {
  readonly simulatorId: SimulatorId;
  readonly name: string;

  constructor(opts: StubSimulatorOptions) {
    this.simulatorId = opts.simulatorId;
    this.name = opts.name;
  }

  async run(_input: TIn): Promise<TOut> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
