/* eslint-disable no-restricted-syntax */
/**
 * /pricing — page contract tests.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import PricingPage from "../page";

describe("/pricing", () => {
  it("renders all 3 tier names", () => {
    const html = renderToString(createElement(PricingPage));
    expect(html).toContain("PPC Foundations");
    expect(html).toContain("Accelerated Mastery");
    expect(html).toContain("Ultimate Transformation");
  });

  it("renders the 3 prices in ₱", () => {
    const html = renderToString(createElement(PricingPage));
    expect(html).toContain("₱2,999");
    expect(html).toContain("₱5,999");
    expect(html).toContain("₱9,999");
  });

  it("marks Mastery as the highlighted tier", () => {
    const html = renderToString(createElement(PricingPage));
    expect(html).toContain("Most students pick this");
  });

  it("CTAs link to /signup?tier=...", () => {
    const html = renderToString(createElement(PricingPage));
    expect(html).toMatch(/href="\/signup\?tier=foundations"/);
    expect(html).toMatch(/href="\/signup\?tier=mastery"/);
    expect(html).toMatch(/href="\/signup\?tier=ultimate"/);
  });

  it("mentions the money-back guarantee", () => {
    const html = renderToString(createElement(PricingPage));
    expect(html).toContain("7-day money-back");
  });

  it("does not contain banned marketing phrases", () => {
    const html = renderToString(createElement(PricingPage));
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
