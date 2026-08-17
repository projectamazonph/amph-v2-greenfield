/* eslint-disable no-restricted-syntax */
/**
 * /checkout/failed — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { Children, isValidElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import FailedPage from "../page";

function componentNames(node: ReactNode): string[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const ownName = typeof node.type === "function" ? node.type.name : "";
  return [ownName, ...Children.toArray(node.props.children).flatMap(componentNames)].filter(
    Boolean,
  );
}

describe("/checkout/failed", () => {
  it("treats the PayMongo return URL as display-only", async () => {
    const page = await FailedPage({ searchParams: Promise.resolve({ orderId: "ord_1" }) });

    // A redirect from hosted checkout is not provider proof of a final payment state.
    // The page must not mount a component that can mutate the order or send email.
    expect(componentNames(page)).not.toContain("PaymentFailureNotifier");
  });

  it("renders the failure title and a Try-again CTA", async () => {
    const html = renderToString(
      await FailedPage({ searchParams: Promise.resolve({ orderId: "ord_1" }) }),
    );
    expect(html).toMatch(/payment not completed/i);
    expect(html).toMatch(/try again/i);
  });

  // H-08: skip-link target. The skip-link in the root layout points at
  // #main-content. The page must expose that id (plus tabIndex=-1 so the
  // link target is focusable) on a <main> tag. Without this, keyboard-only
  // users cannot reach the failure card via the skip link.
  it("renders the skip-link target on a <main> landmark", async () => {
    const html = renderToString(
      await FailedPage({ searchParams: Promise.resolve({ orderId: "ord_1" }) }),
    );
    expect(html).toMatch(/<main[^>]*\bid="main-content"[^>]*\btabindex="-1"[^>]*>/i);
  });

  it("deep-links back to /checkout with the original courseSlug when known", async () => {
    const html = renderToString(
      await FailedPage({
        searchParams: Promise.resolve({ orderId: "ord_1", courseSlug: "ppc-101" }),
      }),
    );
    expect(html).toMatch(/href="\/checkout\?courseSlug=ppc-101"/);
  });

  it("falls back to /courses when no courseSlug is provided", async () => {
    const html = renderToString(
      await FailedPage({ searchParams: Promise.resolve({ orderId: "ord_1" }) }),
    );
    // The Try-again CTA falls back to /courses, and the secondary
    // footer link is also /courses. Assert that no /checkout? link exists.
    expect(html).not.toMatch(/href="\/checkout\?courseSlug=/);
    expect(html).toMatch(/href="\/courses"/);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(await FailedPage({ searchParams: Promise.resolve({}) }));
    const lower = html.toLowerCase();
    expect(lower).not.toContain("delve");
    expect(lower).not.toContain("leverage");
    expect(lower).not.toContain("seamless");
  });

  it("uses the design system button class, not Tailwind utilities", async () => {
    const html = renderToString(await FailedPage({ searchParams: Promise.resolve({}) }));
    expect(html).not.toMatch(/class="[^"]*\bbg-\w+/);
    expect(html).not.toMatch(/class="[^"]*\btext-\[/);
  });
});
