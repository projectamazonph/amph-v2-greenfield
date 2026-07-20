/* eslint-disable no-restricted-syntax */
/**
 * FAQ — 4 contract tests.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { FAQSection } from "../FAQ";

describe("FAQSection", () => {
  it("renders all 6 questions", () => {
    const html = renderToString(createElement(FAQSection));
    expect(html).toContain("Can I pay in installments?");
    expect(html).toContain("Do I get a certificate?");
    expect(html).toContain("Is there a refund?");
    expect(html).toContain("Do I need to be in the Philippines");
    expect(html).toContain("What if I get stuck?");
    expect(html).toContain("seller-side or agency-side");
  });

  it("uses <details>/<summary> for collapse/expand without JS", () => {
    const html = renderToString(createElement(FAQSection));
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
  });

  it("answers the installment question with a plain no", () => {
    const html = renderToString(createElement(FAQSection));
    // The "No" should be the first word of the answer (plain language)
    expect(html).toMatch(/installments\?[\s\S]*?No\./);
  });

  it("does not contain banned phrases", () => {
    const html = renderToString(createElement(FAQSection));
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
    expect(html.toLowerCase()).not.toContain("cutting-edge");
  });
});
