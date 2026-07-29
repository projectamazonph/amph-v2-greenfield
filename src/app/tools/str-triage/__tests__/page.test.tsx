/* eslint-disable no-restricted-syntax */
/**
 * /tools/str-triage — page contract tests.
 *
 * STORY-082: scenario schema expanded; rewritten to match.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: {
      get: (id: string) =>
        id === "str-triage" ? { simulatorId: id, name: "STR Triage", run: async () => null } : null,
    },
  }),
}));

import { renderToString } from "react-dom/server";
import StrTriagePage from "../page";

describe("/tools/str-triage", () => {
  it("renders the scenario title", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toContain("Clean up a broad match campaign for kitchen products");
  });

  it("renders the brief", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toContain("Sponsored Products campaign");
  });

  it("renders seeded search terms", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toContain("stainless steel knife set");
    expect(html).toContain("homechef knife set");
    expect(html).toContain("left handed knife set");
  });

  it("shows the generic target ROAS and search term count", async () => {
    const html = renderToString(await StrTriagePage());
    expect(html).toContain("Target ROAS");
    expect(html).toMatch(/3\.00/);
    expect(html).toMatch(/14/); // count of search terms
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
