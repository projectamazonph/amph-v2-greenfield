/**
 * /tools/listing-audit — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      get: (id: string) =>
        id === "listing-audit"
          ? { simulatorId: id, name: "Listing Audit", run: async () => null }
          : null,
    },
  }),
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import ListingAuditPage from "../page";

describe("/tools/listing-audit", () => {
  it("renders the scenario title from the Stitch spec", async () => {
    const html = renderToString(await ListingAuditPage());
    expect(html).toContain("Bamboo Cutting Board");
  });

  it("renders the brief", async () => {
    const html = renderToString(await ListingAuditPage());
    expect(html).toContain("Audit this listing");
  });

  it("pre-fills title, bullets, and description", async () => {
    const html = renderToString(await ListingAuditPage());
    expect(html).toContain("Premium Kitchen Essential");
    expect(html).toContain("100% organic bamboo");
    expect(html).toContain("Knife-friendly surface");
    expect(html).toContain("High-quality bamboo cutting board");
  });

  it("shows the audit form fields", async () => {
    const html = renderToString(await ListingAuditPage());
    expect(html).toMatch(/id="la-title"/);
    expect(html).toMatch(/id="la-description"/);
  });

  it("links back to the tools index", async () => {
    const html = renderToString(await ListingAuditPage());
    expect(html).toMatch(/href="\/tools"/);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(await ListingAuditPage());
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
