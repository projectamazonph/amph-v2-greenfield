/**
 * Card.test.tsx — pure unit tests via react-dom/server.
 *
 * CSS Modules class names are hashed (e.g., `_card_947XXX`), so we
 * match tokens with `class.includes(token)` instead of exact strings.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Card } from "../Card";

function render(props: Record<string, unknown> = {}, children: React.ReactNode = "Card content") {
  // Type-erase the props to allow passing arbitrary test inputs.
  return renderToString(
    createElement(Card, props as never, children),
  );
}

function hasClassToken(html: string, token: string): boolean {
  const match = html.match(/class="([^"]+)"/);
  if (!match || !match[1]) return false;
  return match[1].split(/\s+/).some((c) => c.includes(token));
}

describe("Card", () => {
  it("renders children", () => {
    const html = render({}, "Hello world");
    expect(html).toContain("Hello world");
  });

  it("renders a <div> element", () => {
    const html = render();
    expect(html.startsWith("<div")).toBe(true);
    expect(html).toContain("</div>");
  });

  it("applies default variant", () => {
    const html = render();
    expect(hasClassToken(html, "default")).toBe(true);
  });

  it("applies interactive variant when specified", () => {
    const html = render({ variant: "interactive" });
    expect(hasClassToken(html, "interactive")).toBe(true);
  });

  it("applies compact variant when specified", () => {
    const html = render({ variant: "compact" });
    expect(hasClassToken(html, "compact")).toBe(true);
  });

  it("applies default padding by default", () => {
    const html = render();
    expect(hasClassToken(html, "default")).toBe(true);
  });

  it("applies comfortable padding when specified", () => {
    const html = render({ padding: "comfortable" });
    expect(hasClassToken(html, "comfortable")).toBe(true);
  });

  it("applies hero padding when specified", () => {
    const html = render({ padding: "hero" });
    expect(hasClassToken(html, "hero")).toBe(true);
  });

  it("passes through extra className", () => {
    const html = render({ className: "extra" });
    expect(html).toContain("extra");
  });

  it("passes through aria-label and id", () => {
    const html = render({ id: "card-1", "aria-label": "Stats card" });
    expect(html).toContain('id="card-1"');
    expect(html).toContain('aria-label="Stats card"');
  });

  it("forwards HTML data attributes", () => {
    const html = render({ "data-testid": "stats-card" });
    expect(html).toContain('data-testid="stats-card"');
  });
});
