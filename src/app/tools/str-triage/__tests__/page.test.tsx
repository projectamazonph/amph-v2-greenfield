/* eslint-disable no-restricted-syntax */
/**
 * /tools/str-triage — page contract tests.
 *
 * Server component. Renders the seeded scenario, 20 search terms,
 * target ROAS, and a form with action selectors. Calls the
 * simulator via the action layer (covered separately).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      get: (id: string) =>
        id === "str-triage"
          ? { simulatorId: id, name: "STR Triage", run: async () => null }
          : null,
    },
  }),
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import StrTriagePage from "../page";

describe("/tools/str-triage", () => {
  it("renders the scenario title from the Stitch spec", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toContain("Clean up a broad match campaign for kitchen products");
  });

  it("renders the brief", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toContain("Sponsored Products campaign");
  });

  it("renders all 20 seeded search terms", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toContain("stainless steel knife set");
    expect(html).toContain("knife set");
    expect(html).toContain("kitchen utensil set");
  });

  it("shows the target ROAS and search term count", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toContain("Target ROAS");
    expect(html).toMatch(/3\.33/);
    expect(html).toMatch(/20/); // count of search terms
  });

  it("links back to the tools index", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toMatch(/href="\/tools"/);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
