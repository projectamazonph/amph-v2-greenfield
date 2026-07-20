/* eslint-disable no-restricted-syntax */
/**
 * /checkout/success — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import SuccessPage from "../page";

describe("/checkout/success", () => {
  it("renders the success title and a link to /dashboard", () => {
    const html = renderToString(
      createElement(SuccessPage, { searchParams: { orderId: "ord_123" } }),
    );
    expect(html).toMatch(/payment received/i);
    expect(html).toMatch(/href="\/dashboard"/);
  });

  it("shows the orderId reference when present", () => {
    const html = renderToString(
      createElement(SuccessPage, { searchParams: { orderId: "ord_xyz" } }),
    );
    expect(html).toMatch(/ord_xyz/);
  });

  it("omits the orderId reference when not present", () => {
    const html = renderToString(
      createElement(SuccessPage, { searchParams: {} }),
    );
    expect(html).not.toMatch(/Order reference/);
  });

  it("links back to /courses as a secondary CTA", () => {
    const html = renderToString(
      createElement(SuccessPage, { searchParams: {} }),
    );
    expect(html).toMatch(/href="\/courses"/);
  });

  it("does not contain banned marketing phrases", () => {
    const html = renderToString(
      createElement(SuccessPage, { searchParams: {} }),
    );
    const lower = html.toLowerCase();
    expect(lower).not.toContain("delve");
    expect(lower).not.toContain("leverage");
    expect(lower).not.toContain("seamless");
  });

  it("uses the design system button class, not Tailwind utilities", () => {
    const html = renderToString(
      createElement(SuccessPage, { searchParams: {} }),
    );
    expect(html).not.toMatch(/class="[^"]*\bbg-\w+/);
    expect(html).not.toMatch(/class="[^"]*\btext-\[/);
  });
});
