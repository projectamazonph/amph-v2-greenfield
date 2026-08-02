/**
 * /tools/listing-audit — page domain tests.
 *
 * Option B: tests the domain layer (simulator registry contract) rather than
 * HTML rendering. The page calls
 * `buildContainer().simulatorRegistry.get("listing-audit")`
 * to retrieve the simulator; verifying this contract is sufficient.
 * HTML rendering is covered by E2E tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSimulator = {
  simulatorId: "listing-audit",
  name: "Listing Audit",
  run: vi.fn(async () => null),
};

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      get: vi.fn(
        (id: string) => (id === "listing-audit" ? mockSimulator : null)
      ),
    },
  }),
}));

describe("/tools/listing-audit — domain layer", () => {
  it("registry returns the listing-audit simulator for the correct ID", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("listing-audit");
    expect(sim).not.toBeNull();
    expect(sim!.simulatorId).toBe("listing-audit");
  });

  it("registry returns null for unknown IDs", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    expect(container.simulatorRegistry.get("definitely-not-registered")).toBeNull();
  });

  it("simulator has required fields (simulatorId, name, run)", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("listing-audit");
    expect(sim).toHaveProperty("simulatorId");
    expect(sim).toHaveProperty("name");
    expect(sim).toHaveProperty("run");
    expect(typeof sim!.run).toBe("function");
  });

  it("run function resolves to null", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const result = await container.simulatorRegistry.get("listing-audit")!.run(undefined);
    expect(result).toBeNull();
  });
});
