/* eslint-disable no-restricted-syntax */
/**
 * Practice — 6 contract tests.
 * The version with sourced copy from the Stitch wireframes.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Practice } from "../Practice";

describe("Practice", () => {
  it("lists all 5 practice tools by name", () => {
    const html = renderToString(createElement(Practice));
    expect(html).toContain("Bid Elevator");
    expect(html).toContain("Campaign Builder");
    expect(html).toContain("Search Term Triage");
    expect(html).toContain("Listing Audit");
    expect(html).toContain("Keyword Research");
  });

  it("honestly labels each tool as 'In development'", () => {
    const html = renderToString(createElement(Practice));
    const matches = html.match(/In development/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("uses sourced scenario titles from the Stitch spec, not invented copy", () => {
    // Each of these strings is a verbatim snippet from
    // docs/ui-specs/STITCH-PROMPTS.md §19-23. If a future change
    // swaps the scenario for invented copy, the assertion fails.
    const html = renderToString(createElement(Practice));
    expect(html).toContain("Reduce ACoS on a high-spend electronics campaign");
    expect(html).toContain("wireless earbuds");
    expect(html).toContain("broad match campaign for kitchen products");
    expect(html).toContain("Bamboo Cutting Board");
  });

  it("links to the wireframes gallery from each tool row", () => {
    const html = renderToString(createElement(Practice));
    const linkMatches = html.match(/See wireframe/g) ?? [];
    expect(linkMatches.length).toBe(5);
    expect(html).toMatch(/href="\/docs\/previews\/wireframes.html"/);
  });

  it("mentions the waitlist in the note below the list", () => {
    const html = renderToString(createElement(Practice));
    expect(html.toLowerCase()).toContain("waitlist");
  });

  it("does not contain any banned marketing phrases", () => {
    const html = renderToString(createElement(Practice));
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
    expect(html.toLowerCase()).not.toContain("cutting-edge");
    expect(html.toLowerCase()).not.toContain("revolutionary");
  });
});
