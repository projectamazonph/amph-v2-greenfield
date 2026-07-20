/**
 * Audience — 4 contract tests.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Audience } from "../Audience";

describe("Audience", () => {
  it("renders the 'for you if' subhead", () => {
    const html = renderToString(createElement(Audience));
    expect(html).toContain("This is for you if");
  });

  it("renders the 'isn't for you if' subhead", () => {
    const html = renderToString(createElement(Audience));
    expect(html).toMatch(/for you if/);
    // The subhead is "This isn't for you if" — apostrophe escaped in SSR
    expect(html).toMatch(/This isn/);
  });

  it("mentions the ₱60k–₱80k target for the right reader", () => {
    const html = renderToString(createElement(Audience));
    expect(html).toContain("₱60k");
  });

  it("says no to the wrong audience (free-course seekers)", () => {
    const html = renderToString(createElement(Audience));
    expect(html).toContain("free course");
  });
});
