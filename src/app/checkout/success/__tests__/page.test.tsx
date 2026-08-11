/* eslint-disable no-restricted-syntax */
/**
 * /checkout/success — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderToString } from "react-dom/server";
import SuccessPage from "../page";

describe("/checkout/success", () => {
  it("renders the success title and a link to /dashboard", async () => {
    const html = renderToString(
      await SuccessPage({ searchParams: Promise.resolve({ orderId: "ord_123" }) }),
    );
    expect(html).toMatch(/payment received/i);
    expect(html).toMatch(/href="\/dashboard"/);
  });

  it("shows the orderId reference when present", async () => {
    const html = renderToString(
      await SuccessPage({ searchParams: Promise.resolve({ orderId: "ord_xyz" }) }),
    );
    expect(html).toMatch(/ord_xyz/);
  });

  it("omits the orderId reference when not present", async () => {
    const html = renderToString(await SuccessPage({ searchParams: Promise.resolve({}) }));
    expect(html).not.toMatch(/Order reference/);
  });

  it("links back to /courses as a secondary CTA", async () => {
    const html = renderToString(await SuccessPage({ searchParams: Promise.resolve({}) }));
    expect(html).toMatch(/href="\/courses"/);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(await SuccessPage({ searchParams: Promise.resolve({}) }));
    const lower = html.toLowerCase();
    expect(lower).not.toContain("delve");
    expect(lower).not.toContain("leverage");
    expect(lower).not.toContain("seamless");
  });

  it("uses the design system button class, not Tailwind utilities", async () => {
    const html = renderToString(await SuccessPage({ searchParams: Promise.resolve({}) }));
    expect(html).not.toMatch(/class="[^"]*\bbg-\w+/);
    expect(html).not.toMatch(/class="[^"]*\btext-\[/);
  });
});
