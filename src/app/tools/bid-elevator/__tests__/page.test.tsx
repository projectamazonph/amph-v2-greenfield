/**
 * /tools/bid-elevator — page contract tests.
 *
 * The page is a server component; render with renderToString and
 * assert the structure that matters (title, brief, form fields).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

// Mock the container BEFORE importing the page.
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      get: (id: string) => {
        if (id !== "bid-elevator") return null;
        return { simulatorId: id, name: "Bid Elevator", run: async () => null };
      },
    },
  }),
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import BidElevatorPage from "../page";

describe("/tools/bid-elevator", () => {
  it("renders the scenario title from the Stitch spec", async () => {
    const html = renderToString(await BidElevatorPage());
    expect(html).toContain("Reduce ACoS on a high-spend electronics campaign");
  });

  it("renders the scenario brief", async () => {
    const html = renderToString(await BidElevatorPage());
    expect(html).toContain("wireless earbuds campaign");
    expect(html).toContain("₱800/day");
  });

  it("renders the seed keywords in the form", async () => {
    const html = renderToString(await BidElevatorPage());
    expect(html).toContain("wireless earbuds");
    expect(html).toContain("bluetooth earbuds");
    expect(html).toContain("noise cancelling earbuds");
  });

  it("shows the daily budget and target ROAS in the meta strip", async () => {
    const html = renderToString(await BidElevatorPage());
    expect(html).toContain("Daily budget");
    expect(html).toContain("Target ROAS");
  });

  it("links back to the tools index", async () => {
    const html = renderToString(await BidElevatorPage());
    expect(html).toMatch(/href="\/tools"/);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(await BidElevatorPage());
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
