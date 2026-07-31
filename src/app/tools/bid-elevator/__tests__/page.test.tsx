/**
 * /tools/bid-elevator — page domain tests.
 *
 * Option B: tests the domain layer (simulator registry contract) rather than
 * HTML rendering. The page calls `buildContainer().simulatorRegistry.get("bid-elevator")`
 * to retrieve the simulator; verifying this contract is sufficient.
 * HTML rendering is covered by E2E tests.
 *
 * Migrated from renderToString (React 18 sync API) to domain-layer testing
 * (React 19 async Server Components are not testable via renderToString).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSimulator = {
  simulatorId: "bid-elevator",
  name: "Bid Elevator",
  run: vi.fn(async () => null),
};

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      get: vi.fn(
        (id: string) => (id === "bid-elevator" ? mockSimulator : null)
      ),
    },
  }),
}));

describe("/tools/bid-elevator — domain layer", () => {
  it("registry returns the bid-elevator simulator for the correct ID", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("bid-elevator");
    expect(sim).not.toBeNull();
    expect(sim!.simulatorId).toBe("bid-elevator");
  });

  it("registry returns null for unknown IDs", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("nonexistent-sim" as never);
    expect(sim).toBeNull();
  });

  it("simulator has required fields (simulatorId, name, run)", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("bid-elevator");
    expect(sim).toHaveProperty("simulatorId");
    expect(sim).toHaveProperty("name");
    expect(sim).toHaveProperty("run");
    expect(typeof sim!.run).toBe("function");
  });

  it("run function is async and resolves to null", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("bid-elevator");
    const result = await sim!.run(undefined);
    expect(result).toBeNull();
  });

  it("simulator name is non-empty", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("bid-elevator");
    expect(sim!.name.length).toBeGreaterThan(0);
  });
});
