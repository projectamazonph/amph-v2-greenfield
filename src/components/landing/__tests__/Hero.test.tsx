/**
 * Hero — landing page section 1.
 * RED test. Implementation does not exist yet.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Hero } from "../Hero";

describe("Hero", () => {
  it("renders the H1 headline that says what the platform is", () => {
    const html = renderToString(createElement(Hero));
    expect(html).toContain("The Amazon ads training built for Filipino VAs");
  });

  it("renders the price-included subhead (no abstract marketing)", () => {
    const html = renderToString(createElement(Hero));
    expect(html).toContain("One-time payment");
    expect(html).toContain("PayMongo");
  });

  it("renders a primary CTA that links to the pricing section", () => {
    const html = renderToString(createElement(Hero));
    expect(html).toMatch(/href=["']#pricing["']/);
  });

  it("renders a secondary CTA for sign-in", () => {
    const html = renderToString(createElement(Hero));
    expect(html).toMatch(/href=["']\/login["']/);
  });

  it("renders an eyebrow tag with the category", () => {
    const html = renderToString(createElement(Hero));
    // eyebrow: Training — Philippines — Amazon Ads
    expect(html).toMatch(/Training.*Amazon/s);
  });
});
