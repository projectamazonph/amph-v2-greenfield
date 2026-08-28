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
import { CampaignBuilderSimulator } from "@/domain/simulator/campaign-builder/CampaignBuilderSimulator";
import { ListingAuditSimulator } from "@/domain/simulator/listing-audit/ListingAuditSimulator";
// STORY-089: Connected Account Simulator
import { ConnectedAccountSimulator } from "@/domain/simulator/connected-account/ConnectedAccountSimulator";
import { KeywordResearchSimulator } from "@/domain/simulator/keyword-research/KeywordResearchSimulator";
import type { SimulatorRegistry } from "@/ports/simulator/SimulatorRegistry";

export function buildSimulatorRegistry(): SimulatorRegistry {
  const registry = new InMemorySimulatorRegistry();

  registry.register(new BidElevatorSimulator());
  registry.register(new StrTriageSimulator());
  registry.register(new CampaignBuilderSimulator());
  registry.register(new ListingAuditSimulator());
  // STORY-081: Keyword Research is its own registry entry, no longer a
  // page-level alias reusing ListingAuditSimulator's keyword generator.
  registry.register(new KeywordResearchSimulator());

  return registry;
}
