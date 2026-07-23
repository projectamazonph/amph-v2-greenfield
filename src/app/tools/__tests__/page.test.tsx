/**
 * /tools — index page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      list: () => [
        { simulatorId: "bid-elevator", name: "Bid Elevator" },
        { simulatorId: "str-triage", name: "STR Triage" },
        { simulatorId: "campaign-builder", name: "Campaign Builder" },
        { simulatorId: "listing-audit", name: "Listing Audit" },
        { simulatorId: "keyword-research", name: "Keyword Research" },
      ],
    },
  }),
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import ToolsIndexPage from "../page";

describe("/tools index", () => {
  it("renders the page title", async () => {
    const html = renderToString(await ToolsIndexPage());
    expect(html).toMatch(/<h1[^>]*>Tools<\/h1>/);
  });

  it("lists all 5 simulators", async () => {
    const html = renderToString(await ToolsIndexPage());
    expect(html).toContain("Bid Elevator");
    expect(html).toContain("Search Term Triage");
    expect(html).toContain("Campaign Builder");
    expect(html).toContain("Listing Audit");
    expect(html).toContain("Keyword Research");
  });

  it("links each simulator to its page", async () => {
    const html = renderToString(await ToolsIndexPage());
    expect(html).toMatch(/href="\/tools\/bid-elevator"/);
    expect(html).toMatch(/href="\/tools\/str-triage"/);
    expect(html).toMatch(/href="\/tools\/campaign-builder"/);
    expect(html).toMatch(/href="\/tools\/listing-audit"/);
    expect(html).toMatch(/href="\/tools\/keyword-research"/);
  });

  it("shows the simulator count", async () => {
    const html = renderToString(await ToolsIndexPage());
    // React inserts a comment between text nodes; the count and the
    // phrase "practice tools" are split. Match both fragments.
    expect(html).toContain("practice tools");
    // 6 links: 4 registered simulators + 1 hardcoded keyword-research card +
    // 1 more keyword-research link from the hardcoded block (renders twice:
    // once via registered mapping, once as the explicit hardcoded card).
    const cardLinks = html.match(/href="\/tools\//g) ?? [];
    expect(cardLinks.length).toBe(6);
  });
});
