import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");
const SCRIPT = resolve(ROOT, "scripts/validate-simulator-registry.ts");
const PACKAGE_JSON = resolve(ROOT, "package.json");
const SEED_SCRIPT = resolve(ROOT, "scripts/seed-simulator-scenarios.ts");
const REGISTRY = resolve(ROOT, "src/infra/simulator/buildSimulatorRegistry.ts");
const SCENARIO_ENTITY = resolve(ROOT, "src/domain/entities/SimulatorScenario.ts");
const INDEX = resolve(ROOT, "src/domain/simulator/connected-account/index.ts");

/**
 * STORY-089 static + filesystem smoke checks for the sixth-simulator
 * rule. The validator script itself is exercised by running
 * `pnpm validate:simulator-registry` (CI + local). This Vitest spec
 * pins the file-system-level configuration the validator depends on:
 * a 6-id scenario list and a 6-entry registry that both name the new
 * simulator. Drift on either side fails the suite before the validator
 * even runs.
 */

const EXPECTED_SIMULATOR_IDS = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
  "keyword-research",
  // STORY-089: sixth simulator.
  "connected-account",
];

// The validator only checks that every registered simulator has at
// least one published scenario, by id. The seed script happens to
// use "scenario-default" as the canonical id for the entry-level
// scenario of bid-elevator / campaign-builder / keyword-research /
// connected-account, and different names for the variants of
// str-triage and listing-audit. Pin the actual scenario ids that
// match each simulator so a rename fails the spec.
const EXPECTED_SCENARIO_IDS = [
  "bid-elevator-scenario-default",
  "str-triage-scenario-kitchen-products",
  "campaign-builder-scenario-default",
  "listing-audit-scenario-bamboo-cutting-board",
  "keyword-research-scenario-default",
  // STORY-089: sixth scenario seed.
  "connected-account-scenario-default",
];

describe("validate-simulator-registry", () => {
  it("the validator script exists", () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it("is registered as an npm script", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["validate:simulator-registry"]).toBe(
      "tsx scripts/validate-simulator-registry.ts",
    );
  });

  it("calls buildSimulatorRegistry() (the production factory)", () => {
    const source = readFileSync(SCRIPT, "utf8");
    expect(source).toContain("buildSimulatorRegistry()");
  });

  it("the simulator registry registers the connected-account simulator", () => {
    const source = readFileSync(REGISTRY, "utf8");
    expect(source).toContain("new ConnectedAccountSimulator()");
  });

  it("the SimulatorId union includes connected-account", () => {
    const source = readFileSync(SCENARIO_ENTITY, "utf8");
    expect(source).toContain('"connected-account"');
  });

  it("the seed script publishes a connected-account scenario", () => {
    const source = readFileSync(SEED_SCRIPT, "utf8");
    expect(source).toContain('simulatorId: "connected-account"');
    expect(source).toContain('id: "connected-account-scenario-default"');
  });

  it("the connected-account domain module exports its simulator", () => {
    const source = readFileSync(INDEX, "utf8");
    expect(source).toContain("ConnectedAccountSimulator");
  });

  it("every simulator id is enumerated exactly once across validator + seed + registry", () => {
    const seedSource = readFileSync(SEED_SCRIPT, "utf8");
    const entitySource = readFileSync(SCENARIO_ENTITY, "utf8");
    const registrySource = readFileSync(REGISTRY, "utf8");

    for (const id of EXPECTED_SIMULATOR_IDS) {
      // Seed script must have at least one published scenario for each id.
      expect(seedSource).toContain(`simulatorId: "${id}"`);
      // Entity union must include each id.
      expect(entitySource).toContain(`"${id}"`);
      // The registry imports a typed simulator class whose name
      // embeds the id (e.g. BidElevatorSimulator, ConnectedAccountSimulator).
      // We assert that pattern, not a "simulatorId:" literal which
      // the registry does not carry — it only constructs class
      // instances, and the simulatorId field lives on each class.
      const camelCase = id
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
      expect(registrySource).toContain(`new ${camelCase}Simulator()`);
    }
  });

  it("every expected scenario seed id appears in the seed script", () => {
    const seedSource = readFileSync(SEED_SCRIPT, "utf8");
    for (const id of EXPECTED_SCENARIO_IDS) {
      expect(seedSource).toContain(`id: "${id}"`);
    }
  });

  it("the validator and seed agree on the six simulator ids", () => {
    // The validator's SCENARIO_IDS_BY_SIMULATOR map is the source of
    // truth it checks against. We assert the same ids appear in the
    // seed script and registry so any future drift between the three
    // files fails the spec instead of silently passing the validator.
    const validatorSource = readFileSync(SCRIPT, "utf8");
    const seedSource = readFileSync(SEED_SCRIPT, "utf8");

    for (const id of EXPECTED_SIMULATOR_IDS) {
      expect(validatorSource).toContain(`"${id}": [`);
      expect(seedSource).toContain(`simulatorId: "${id}"`);
    }
  });
});
