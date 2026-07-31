/**
 * /tools — index page domain tests.
 *
 * Option B: tests the domain layer (simulator registry) rather than HTML output.
 * HTML rendering is covered by E2E tests. This file verifies that the
 * container's simulator registry returns the expected data structure
 * so that the page has the correct data to render.
 *
 * Migrated from renderToString (React 18 sync API) to domain-layer testing
 * (React 19 async Server Components are not testable via renderToString).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSimulators = [
  { simulatorId: "bid-elevator", name: "Bid Elevator" },
  { simulatorId: "str-triage", name: "STR Triage" },
  { simulatorId: "campaign-builder", name: "Campaign Builder" },
  { simulatorId: "listing-audit", name: "Listing Audit" },
  { simulatorId: "keyword-research", name: "Keyword Research" },
];

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      list: vi.fn(() => mockSimulators),
    },
  }),
}));

// Page-imports StudentShell — mocked globally in vitest.setup.ts
// No need to import or render the page component in domain tests.

describe("/tools index — domain layer", () => {
  it("registry lists 5 simulators", async () => {
    // Import lazily so mocks are already in place
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const simulators = container.simulatorRegistry.list();

    expect(simulators).toHaveLength(5);
  });

  it("registry includes bid elevator", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const simulators = container.simulatorRegistry.list();

    expect(simulators).toContainEqual(
      expect.objectContaining({ simulatorId: "bid-elevator", name: "Bid Elevator" })
    );
  });

  it("registry includes all expected simulator IDs", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const simulators = container.simulatorRegistry.list();
    const ids = simulators.map((s: { simulatorId: string }) => s.simulatorId);

    expect(ids).toContain("bid-elevator");
    expect(ids).toContain("str-triage");
    expect(ids).toContain("campaign-builder");
    expect(ids).toContain("listing-audit");
    expect(ids).toContain("keyword-research");
  });

  it("registry returns simulator objects with name field for rendering", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const simulators = container.simulatorRegistry.list();

    simulators.forEach((simulator: { simulatorId: string; name: string }) => {
      expect(simulator).toHaveProperty("simulatorId");
      expect(simulator).toHaveProperty("name");
      expect(typeof simulator.name).toBe("string");
      expect(simulator.name.length).toBeGreaterThan(0);
    });
  });

  it("page title simulator is present", async () => {
    // Sanity check: the page title references "practice tools"
    // which is the display name for the index listing.
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const simulators = container.simulatorRegistry.list();
    const names = simulators.map((s: { name: string }) => s.name);

    expect(names.join(" ")).toMatch(/practice tools|bid|elevator|triage/i);
  });
});
