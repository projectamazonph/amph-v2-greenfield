/* eslint-disable no-restricted-syntax */
/**
 * Practice — contract tests for the landing page practice section.
 *
 * Tests verify the section lists all 5 simulators, shows the correct
 * copy, links to each tool page, and contains no banned marketing phrases.
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

  it("marks Keyword Research as New", () => {
    const html = renderToString(createElement(Practice));
    expect(html).toContain("Keyword Research");
    expect(html).toMatch(/<span[^>]*>New<\/span>/);
  });

  it("links each tool to its page", () => {
    const html = renderToString(createElement(Practice));
    expect(html).toMatch(/href="\/tools\/bid-elevator"/);
    expect(html).toMatch(/href="\/tools\/campaign-builder"/);
    expect(html).toMatch(/href="\/tools\/str-triage"/);
    expect(html).toMatch(/href="\/tools\/listing-audit"/);
    expect(html).toMatch(/href="\/tools\/keyword-research"/);
  });

  it("renders 5 simulator cards", () => {
    const html = renderToString(createElement(Practice));
    // One card li per tool (5 tools defined in TOOLS).
    const cardMatches = html.match(/<li class="/g) ?? [];
    expect(cardMatches.length).toBe(5);
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
