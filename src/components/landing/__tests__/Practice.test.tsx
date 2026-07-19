/**
 * Practice — 5 contract tests.
 * The new, honest version that says the simulators are in development.
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
    // 5 tool rows + 0 elsewhere = 5
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("does not contain any banned marketing phrases", () => {
    const html = renderToString(createElement(Practice));
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
    expect(html.toLowerCase()).not.toContain("cutting-edge");
    expect(html.toLowerCase()).not.toContain("revolutionary");
  });

  it("mentions the waitlist in the note below the list", () => {
    const html = renderToString(createElement(Practice));
    expect(html.toLowerCase()).toContain("waitlist");
  });

  it("does not pretend the tools are finished (no 'available now' / 'try it')", () => {
    const html = renderToString(createElement(Practice)).toLowerCase();
    expect(html).not.toContain("try it now");
    expect(html).not.toContain("available now");
    expect(html).not.toContain("start practicing");
  });
});
