/**
 * Simulators — 5 contract tests.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Simulators } from "../Simulators";

describe("Simulators", () => {
  it("renders all 5 simulator names", () => {
    const html = renderToString(createElement(Simulators));
    expect(html).toContain("Campaign Builder");
    expect(html).toContain("Bid Elevator");
    expect(html).toContain("STR Triage");
    expect(html).toContain("Listing Audit");
    expect(html).toContain("Keyword Research");
  });

  it("renders a <svg> for each simulator mockup", () => {
    const html = renderToString(createElement(Simulators));
    const svgs = html.match(/<svg/g) ?? [];
    // 5 simulator mockups + 0 icon svgs in this component = 5
    expect(svgs.length).toBeGreaterThanOrEqual(5);
  });

  it("includes 'You will:' label on each tool", () => {
    const html = renderToString(createElement(Simulators));
    const matches = html.match(/You will:/g) ?? [];
    expect(matches.length).toBe(5);
  });

  it("does not use the banned phrase 'delve' or 'leverage' or 'seamless'", () => {
    const html = renderToString(createElement(Simulators));
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });

  it("renders the section heading that frames the practice angle", () => {
    const html = renderToString(createElement(Simulators));
    // React escapes the apostrophe to &#x27; in SSR output
    expect(html).toMatch(/just watch lessons/);
  });
});
