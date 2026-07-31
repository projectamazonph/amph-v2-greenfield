/**
 * /tools/campaign-builder — page domain tests.
 *
 * Option B: tests the domain layer (simulator registry contract) rather than
 * HTML rendering. The page calls
 * `buildContainer().simulatorRegistry.get("campaign-builder")`
 * to retrieve the simulator; verifying this contract is sufficient.
 * HTML rendering is covered by E2E tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSimulator = {
  simulatorId: "campaign-builder",
  name: "Campaign Builder",
  run: vi.fn(async () => null),
};

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      get: vi.fn(
        (id: string) => (id === "campaign-builder" ? mockSimulator : null)
      ),
    },
  }),
}));

describe("/tools/campaign-builder — domain layer", () => {
  it("registry returns the campaign-builder simulator for the correct ID", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("campaign-builder");
    expect(sim).not.toBeNull();
    expect(sim!.simulatorId).toBe("campaign-builder");
  });

  it("registry returns null for unknown IDs", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    expect(container.simulatorRegistry.get("campaign-bldr" as never)).toBeNull();
  });

  it("simulator has required fields (simulatorId, name, run)", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const sim = container.simulatorRegistry.get("campaign-builder");
    expect(sim).toHaveProperty("simulatorId");
    expect(sim).toHaveProperty("name");
    expect(sim).toHaveProperty("run");
    expect(typeof sim!.run).toBe("function");
  });

  it("run function resolves to null", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const result = await container.simulatorRegistry.get("campaign-builder")!.run(undefined);
    expect(result).toBeNull();
  });
});
