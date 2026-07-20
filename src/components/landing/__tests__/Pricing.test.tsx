/**
 * Pricing — RED-GREEN. 5 contract tests.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Pricing } from "../Pricing";

describe("Pricing", () => {
  it("renders all three tier names", () => {
    const html = renderToString(createElement(Pricing));
    expect(html).toContain("PPC Foundations");
    expect(html).toContain("Accelerated Mastery");
    expect(html).toContain("Ultimate Transformation");
  });

  it("renders the three prices in ₱", () => {
    const html = renderToString(createElement(Pricing));
    expect(html).toContain("₱2,999");
    expect(html).toContain("₱5,999");
    expect(html).toContain("₱9,999");
  });

  it("marks 'one-time' on each tier (no subscription copy)", () => {
    const html = renderToString(createElement(Pricing));
    // three occurrences of "one-time"
    const matches = html.match(/one-time/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("highlights the Mastery tier as the most-picked one", () => {
    const html = renderToString(createElement(Pricing));
    expect(html).toContain("Most students pick this");
  });

  it("mentions PayMongo + GCash for the payment note", () => {
    const html = renderToString(createElement(Pricing));
    expect(html).toContain("PayMongo");
    expect(html).toContain("GCash");
  });
});
