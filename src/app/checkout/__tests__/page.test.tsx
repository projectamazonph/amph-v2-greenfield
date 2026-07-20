/* eslint-disable no-restricted-syntax */
/**
 * /checkout — page contract tests.
 *
 * The page is a client component (it uses useSearchParams +
 * useActionState). We render it server-side via renderToString
 * to lock in the static shape:
 *  - Title + "Pay with PayMongo" button
 *  - Hidden courseSlug field
 *  - No banned marketing phrases
 *  - Links to /login and /courses for recovery
 *
 * The dynamic state transitions (action → redirect, error
 * alerts) are tested at the action level in
 * src/app/actions/__tests__/checkout.action.test.ts.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
// The action is mocked at the module level because the test only
// needs the static render output. The action contract is covered
// in the action test.
vi.mock("@/app/actions/checkout.action", () => ({
  startCheckout: vi.fn(async () => ({ kind: "idle" as const })),
  CHECKOUT_INITIAL_STATE: { kind: "idle" as const },
}));

// Stub next/navigation hooks used by the client page.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams("courseSlug=ppc-101"),
  usePathname: () => "/checkout",
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import CheckoutPage from "../page";

describe("/checkout", () => {
  it("renders the title and the Pay-with-PayMongo button", () => {
    const html = renderToString(createElement(CheckoutPage));
    expect(html).toMatch(/confirm your purchase/i);
    expect(html).toMatch(/pay with paymongo/i);
  });

  it("renders a hidden courseSlug field with the slug from the query", () => {
    const html = renderToString(createElement(CheckoutPage));
    expect(html).toMatch(/<input[^>]+name="courseSlug"[^>]+value="ppc-101"/);
  });

  it("renders a form wired to the server action", () => {
    const html = renderToString(createElement(CheckoutPage));
    expect(html).toMatch(/<form/);
    expect(html).toMatch(/<button[^>]*type="submit"/);
  });

  it("links back to /courses for recovery", () => {
    const html = renderToString(createElement(CheckoutPage));
    expect(html).toMatch(/href="\/courses"/);
  });

  it("does not contain banned marketing phrases", () => {
    const html = renderToString(createElement(CheckoutPage));
    const lower = html.toLowerCase();
    expect(lower).not.toContain("delve");
    expect(lower).not.toContain("leverage");
    expect(lower).not.toContain("seamless");
    expect(lower).not.toContain("cutting-edge");
    expect(lower).not.toContain("world-class");
    expect(lower).not.toContain("best-in-class");
  });

  it("uses the design system button class, not inline Tailwind utilities", () => {
    const html = renderToString(createElement(CheckoutPage));
    // The CTA goes through the .btn / .btn-primary class. It must
    // not include any Tailwind utility class names.
    expect(html).not.toMatch(/class="[^"]*\bbg-\w+/);
    expect(html).not.toMatch(/class="[^"]*\btext-\[/);
    expect(html).not.toMatch(/class="[^"]*\bp-\d/);
  });
});
