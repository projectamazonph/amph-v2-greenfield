/* eslint-disable no-restricted-syntax */
/**
 * /checkout/failed — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import FailedPage from "../page";

describe("/checkout/failed", () => {
  it("renders the failure title and a Try-again CTA", () => {
    const html = renderToString(
      createElement(FailedPage, { searchParams: { orderId: "ord_1" } }),
    );
    expect(html).toMatch(/payment not completed/i);
    expect(html).toMatch(/try again/i);
  });

  it("deep-links back to /checkout with the original courseSlug when known", () => {
    const html = renderToString(
      createElement(FailedPage, {
        searchParams: { orderId: "ord_1", courseSlug: "ppc-101" },
      }),
    );
    expect(html).toMatch(/href="\/checkout\?courseSlug=ppc-101"/);
  });

  it("falls back to /courses when no courseSlug is provided", () => {
    const html = renderToString(
      createElement(FailedPage, { searchParams: { orderId: "ord_1" } }),
    );
    // The Try-again CTA falls back to /courses, and the secondary
    // footer link is also /courses. Assert that no /checkout? link exists.
    expect(html).not.toMatch(/href="\/checkout\?courseSlug=/);
    expect(html).toMatch(/href="\/courses"/);
  });

  it("does not contain banned marketing phrases", () => {
    const html = renderToString(
      createElement(FailedPage, { searchParams: {} }),
    );
    const lower = html.toLowerCase();
    expect(lower).not.toContain("delve");
    expect(lower).not.toContain("leverage");
    expect(lower).not.toContain("seamless");
  });

  it("uses the design system button class, not Tailwind utilities", () => {
    const html = renderToString(
      createElement(FailedPage, { searchParams: {} }),
    );
    expect(html).not.toMatch(/class="[^"]*\bbg-\w+/);
    expect(html).not.toMatch(/class="[^"]*\btext-\[/);
  });
});
