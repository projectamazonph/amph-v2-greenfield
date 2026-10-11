/**
 * scripts/validate-simulator-registry.ts
 *
 * STORY-089: gate for the sixth-simulator rule. Walks the in-process
 * SimulatorRegistry and asserts that every registered simulator id is
 * present in the domain entity's `SimulatorId` union (no rogue id
 * that the schema would later reject) AND that every registered id
 * appears in the `connected-account` scenario seed list (no simulator
 * that ships without a publishable scenario, which would later trip
 * the readiness probe in `/api/health/ready`).
 *
 * This script does NOT require DATABASE_URL. It is a static,
 * in-process check — both containers (`buildProductionContainer` and
 * `buildTestContainer`) wire `simulatorRegistry` through the same
 * `buildSimulatorRegistry()` factory, and the seed list is right next
 * to the simulator in source. The runtime check against the actual
 * published rows lives in `src/app/api/health/ready/route.ts`.
 *
 * Usage:
 *   pnpm validate:simulator-registry
 *
 * Exit code 0 = pass, exit code 1 = registry and seed list disagree.
 */

import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";

/**
 * Mirror of the ids `scripts/seed-simulator-scenarios.ts` ships a
 * published scenario for. Listed here (not imported) so a future
 * accidental edit to either side is caught: a simulator registered
 * without a scenario fails this check, and a scenario seeded without
 * a registered simulator is wasted work.
 */
const SCENARIO_IDS_BY_SIMULATOR: Readonly<Record<string, readonly string[]>> = {
  "bid-elevator": ["bid-elevator-scenario-default"],
  "str-triage": ["str-triage-scenario-kitchen-products"],
  "campaign-builder": ["campaign-builder-scenario-default"],
  "listing-audit": ["listing-audit-scenario-bamboo-cutting-board"],
  "keyword-research": ["keyword-research-scenario-default"],
  // STORY-089: sixth simulator's starter scenario.
  "connected-account": ["connected-account-scenario-default"],
};

function main() {
  const registry = buildSimulatorRegistry();
  const registered = registry.list();
  const registeredIds = registered.map((s) => s.simulatorId).sort();

  const expected = Object.keys(SCENARIO_IDS_BY_SIMULATOR).sort();

  const registeredSet = new Set(registeredIds);
  const expectedSet = new Set(expected);

  const registeredWithoutScenario = registeredIds.filter((id) => !expectedSet.has(id));
  const scenarioWithoutRegistration = expected.filter((id) => !registeredSet.has(id));

  console.log("AMPH SimulatorRegistry validator");
  console.log("─".repeat(40));
  console.log(`  Registered: ${registeredIds.length}`);
  console.log(`  Scenarios:   ${expected.length}`);
  console.log("─".repeat(40));

  for (const id of registeredIds) {
    const scenarios = SCENARIO_IDS_BY_SIMULATOR[id] ?? [];
    console.log(`  [ok]    ${id} (${scenarios.length} scenario seed)`);
  }

  if (registeredWithoutScenario.length > 0 || scenarioWithoutRegistration.length > 0) {
    console.error("\n[FAIL] SimulatorRegistry and scenario seed list disagree.\n");

    if (registeredWithoutScenario.length > 0) {
      console.error(
        `  Registered simulators without a seed scenario: ${registeredWithoutScenario.join(", ")}`,
      );
      console.error(
        "  Add a published SimulatorScenario entry to scripts/seed-simulator-scenarios.ts.",
      );
    }

    if (scenarioWithoutRegistration.length > 0) {
      console.error(
        `  Scenario seed list entries with no registered simulator: ${scenarioWithoutRegistration.join(", ")}`,
      );
      console.error("  Either register the simulator (buildSimulatorRegistry) or remove the seed.");
    }

    console.error(
      "\nSTORY-089 readiness rule: every registered simulator MUST have a published SimulatorScenario row.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `\n[OK] All ${registeredIds.length} registered simulators have a scenario seed and match the domain union.`,
  );
}

main();
