/**
 * Button.test.tsx — pure unit tests via react-dom/server.
 *
 * Vitest's `environment: "node"` means we can't use @testing-library/react
 * (no DOM). Instead we render to a static HTML string with
 * react-dom/server.renderToString and assert on substrings.
 *
 * CSS Modules hash class names (e.g., `_btn_947XXX`, `_primary_abc123`),
 * so the assertions check for the variant/size as a substring of a class
 * token, not as a literal class.
 *
 * What we cover:
 * - Children render
 * - Default type=button (prevents form submission)
 * - Explicit type=submit is respected
 * - Variant + size classes are applied
 * - Disabled, name, value, aria-label pass through
 * - Extra className merges
 *
 * Not covered here (need a DOM env + Playwright for the visual state):
 * - :hover, :active, :focus-visible styling
 * - Click handler firing
 * - Tab order
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement, type ReactNode } from "react";
import { Button } from "../Button";

function render(
  props: Record<string, unknown> = {},
  children: ReactNode = "Click me",
) {
  // Type-erase the props to allow passing arbitrary test inputs.
  return renderToString(
    createElement(Button, props as never, children),
  );
}

// CSS Modules produce class names like `_btn_947XXX` and `_primary_abc123`.
// Match the variant/size as a token in a whitespace-separated class list.
function hasClassToken(html: string, token: string): boolean {
  const match = html.match(/class="([^"]+)"/);
  if (!match || !match[1]) return false;
  return match[1].split(/\s+/).some((c) => c.includes(token));
}

describe("Button", () => {
  it("renders children", () => {
    const html = render({}, "Save");
    expect(html).toContain("Save");
  });

  it("renders a <button> element", () => {
    const html = render();
    expect(html.startsWith("<button")).toBe(true);
    expect(html).toContain("</button>");
  });

  it("defaults to type=button (does not submit forms)", () => {
    const html = render();
    expect(html).toContain('type="button"');
  });

  it("respects explicit type=submit", () => {
    const html = render({ type: "submit" });
    expect(html).toContain('type="submit"');
  });

  it("applies primary variant class", () => {
    const html = render({ variant: "primary" });
    expect(hasClassToken(html, "primary")).toBe(true);
  });

  it("applies secondary variant class", () => {
    const html = render({ variant: "secondary" });
    expect(hasClassToken(html, "secondary")).toBe(true);
  });

  it("applies ghost variant class", () => {
    const html = render({ variant: "ghost" });
    expect(hasClassToken(html, "ghost")).toBe(true);
  });

  it("applies danger variant class", () => {
    const html = render({ variant: "danger" });
    expect(hasClassToken(html, "danger")).toBe(true);
  });

  it("applies success variant class", () => {
    const html = render({ variant: "success" });
    expect(hasClassToken(html, "success")).toBe(true);
  });

  it("applies info variant class", () => {
    const html = render({ variant: "info" });
    expect(hasClassToken(html, "info")).toBe(true);
  });

  it("applies sm size class", () => {
    const html = render({ size: "sm" });
    expect(hasClassToken(html, "sm")).toBe(true);
  });

  it("applies lg size class", () => {
    const html = render({ size: "lg" });
    expect(hasClassToken(html, "lg")).toBe(true);
  });

  it("defaults to md size", () => {
    const html = render();
    expect(hasClassToken(html, "md")).toBe(true);
  });

  it("passes through disabled", () => {
    const html = render({ disabled: true });
    expect(html).toContain("disabled");
  });

  it("passes through name + value", () => {
    const html = render({ name: "submit-btn", value: "go" });
    expect(html).toContain('name="submit-btn"');
    expect(html).toContain('value="go"');
  });

  it("passes through aria-label", () => {
    const html = render({ "aria-label": "Save changes" });
    expect(html).toContain('aria-label="Save changes"');
  });

  it("accepts extra className and merges it", () => {
    const html = render({ className: "extra-class" });
    expect(html).toContain("extra-class");
    expect(hasClassToken(html, "primary")).toBe(true);
  });
});
