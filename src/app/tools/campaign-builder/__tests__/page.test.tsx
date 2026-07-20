/* eslint-disable no-restricted-syntax */
/**
 * /tools/campaign-builder — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      get: (id: string) =>
        id === "campaign-builder"
          ? { simulatorId: id, name: "Campaign Builder", run: async () => null }
          : null,
    },
  }),
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import CampaignBuilderPage from "../page";

describe("/tools/campaign-builder", () => {
  it("renders the scenario title from the Stitch spec", async () => {
    const html = renderToString(await CampaignBuilderPage());
    expect(html).toContain("Launch a Sponsored Products campaign for wireless earbuds");
  });

  it("renders the brief", async () => {
    const html = renderToString(await CampaignBuilderPage());
    expect(html).toContain("Sponsored Products");
    expect(html).toContain("manual targeting");
  });

  it("pre-fills product category, niche, and budget", async () => {
    const html = renderToString(await CampaignBuilderPage());
    expect(html).toContain("Electronics");
    expect(html).toContain("wireless earbuds");
    expect(html).toContain('value="15000"');
  });

  it("renders all 3 targeting options", async () => {
    const html = renderToString(await CampaignBuilderPage());
    expect(html).toContain("Manual");
    expect(html).toContain("Auto");
    expect(html).toContain("Hybrid");
  });

  it("links back to the tools index", async () => {
    const html = renderToString(await CampaignBuilderPage());
    expect(html).toMatch(/href="\/tools"/);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(await CampaignBuilderPage());
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
