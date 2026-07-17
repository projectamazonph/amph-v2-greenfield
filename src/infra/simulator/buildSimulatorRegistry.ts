/**
 * buildSimulatorRegistry — creates a SimulatorRegistry with all 4 simulator stubs.
 *
 * STORY-036: Simulator infrastructure.
 *
 * Called by both the production and test containers.
 * Real implementations (STORY-037+) replace individual stubs via the registry
 * without changing this factory.
 */

import { InMemorySimulatorRegistry } from "@/infra/simulator/InMemorySimulatorRegistry";
import { StubSimulator } from "@/infra/simulator/StubSimulator";
import { BidElevatorSimulator } from "@/domain/simulator/bid-elevator/BidElevatorSimulator";
import { StrTriageSimulator } from "@/domain/simulator/str-triage/StrTriageSimulator";
import type { SimulatorRegistry } from "@/ports/simulator/SimulatorRegistry";

export function buildSimulatorRegistry(): SimulatorRegistry {
  const registry = new InMemorySimulatorRegistry();

  registry.register(new BidElevatorSimulator());
  registry.register(new StrTriageSimulator());
  registry.register(
    new StubSimulator<unknown, unknown>({
      simulatorId: "campaign-builder",
      name: "Campaign Builder",
    }),
  );
  registry.register(
    new StubSimulator<unknown, unknown>({
      simulatorId: "listing-audit",
      name: "Listing Audit + Keyword Research",
    }),
  );

  return registry;
}
