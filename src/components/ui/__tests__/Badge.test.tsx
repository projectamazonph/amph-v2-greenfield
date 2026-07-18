/**
 * Badge.test.tsx — pure unit tests via react-dom/server.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Badge } from "../Badge";

function render(
  props: Record<string, unknown> = {},
  children: React.ReactNode = "Active",
) {
  // Type-erase the props to allow passing arbitrary test inputs.
  return renderToString(
    createElement(Badge, props as never, children),
  );
}

function classAttr(html: string): string {
  const match = html.match(/class="([^"]+)"/);
  return match?.[1] ?? "";
}

describe("Badge", () => {
  it("renders children", () => {
    const html = render({}, "Pending");
    expect(html).toContain("Pending");
  });

  it("renders a <span> element", () => {
    const html = render();
    expect(html.startsWith("<span")).toBe(true);
    expect(html).toContain("</span>");
  });

  it("applies neutral variant by default", () => {
    const html = render();
    expect(classAttr(html)).toContain("neutral");
  });

  it("applies success variant", () => {
    const html = render({ variant: "success" });
    expect(classAttr(html)).toContain("success");
  });

  it("applies warning variant", () => {
    const html = render({ variant: "warning" });
    expect(classAttr(html)).toContain("warning");
  });

  it("applies danger variant", () => {
    const html = render({ variant: "danger" });
    expect(classAttr(html)).toContain("danger");
  });

  it("applies info variant", () => {
    const html = render({ variant: "info" });
    expect(classAttr(html)).toContain("info");
  });

  it("applies accent variant", () => {
    const html = render({ variant: "accent" });
    expect(classAttr(html)).toContain("accent");
  });

  it("applies square shape by default", () => {
    const html = render();
    expect(classAttr(html)).toContain("square");
  });

  it("applies pill shape when specified", () => {
    const html = render({ shape: "pill" });
    expect(classAttr(html)).toContain("pill");
  });

  it("passes through extra className", () => {
    const html = render({ className: "extra" });
    expect(classAttr(html)).toContain("extra");
  });

  it("passes through title (for tooltips)", () => {
    const html = render({ title: "Active since 2026" });
    expect(html).toContain('title="Active since 2026"');
  });
});
