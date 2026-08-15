/**
 * index.test.ts - locks in the @/components/ui public API surface.
 *
 * Round 6 (M-06) wires Toast through the barrel. Round 9 (H-07) wires
 * the remaining primitives through the barrel so consumers stop
 * deep-importing `@/components/ui/<Name>`. This test prevents future
 * barrel edits from accidentally dropping a symbol or renaming its
 * export. Add new exports to the assertions below as the design system
 * grows.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import * as ui from "@/components/ui";

describe("@/components/ui barrel", () => {
  it("exports Button, Card, Input, Badge, SubmitButton", () => {
    expect(ui.Button).toBeDefined();
    expect(ui.Card).toBeDefined();
    expect(ui.Input).toBeDefined();
    expect(ui.Badge).toBeDefined();
    expect(ui.SubmitButton).toBeDefined();
  });

  it("exports Toast and ToastContainer (M-06 fix)", () => {
    expect(ui.Toast).toBeTypeOf("function");
    expect(ui.ToastContainer).toBeTypeOf("function");
  });

  it("exports Breadcrumb, CommandPalette, ConfirmDialog, EmptyState (H-07 fix)", () => {
    expect(ui.Breadcrumb).toBeTypeOf("function");
    expect(ui.CommandPalette).toBeTypeOf("function");
    expect(ui.ConfirmDialog).toBeTypeOf("function");
    expect(ui.EmptyState).toBeTypeOf("function");
  });

  it("exports MobileNavToggle, PrintButton, RouteError, ScrollToTop (H-07 fix)", () => {
    expect(ui.MobileNavToggle).toBeTypeOf("function");
    expect(ui.PrintButton).toBeTypeOf("function");
    expect(ui.RouteError).toBeTypeOf("function");
    expect(ui.ScrollToTop).toBeTypeOf("function");
  });

  it("exports every Skeleton primitive (H-07 fix)", () => {
    expect(ui.SkeletonBlock).toBeTypeOf("function");
    expect(ui.SkeletonText).toBeTypeOf("function");
    expect(ui.SkeletonRow).toBeTypeOf("function");
    expect(ui.SkeletonCard).toBeTypeOf("function");
    expect(ui.SkeletonTable).toBeTypeOf("function");
    expect(ui.SkeletonStatTile).toBeTypeOf("function");
    expect(ui.SkeletonForm).toBeTypeOf("function");
  });
});

describe("Toast via barrel", () => {
  it("renders the message in an alert region", () => {
    const html = renderToString(createElement(ui.Toast, { type: "success", message: "Saved" }));
    expect(html).toContain("Saved");
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
  });

  it("renders ToastContainer children", () => {
    const html = renderToString(
      createElement(
        ui.ToastContainer,
        null,
        createElement(ui.Toast, { type: "info", message: "Hello" }),
      ),
    );
    expect(html).toContain("Hello");
  });
});

describe("H-07 primitives render via barrel", () => {
  // Breadcrumb is a pure presentational server component; render it
  // through renderToString to confirm the import wires correctly.
  it("Breadcrumb renders the items with aria-current on the last entry", () => {
    const html = renderToString(
      createElement(ui.Breadcrumb, {
        items: [{ href: "/tools", label: "Tools" }, { label: "Current" }],
      }),
    );
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("Tools");
    expect(html).toContain("Current");
    expect(html).toContain('aria-current="page"');
  });

  // EmptyState is a pure presentational server component.
  it("EmptyState renders title, description, and action prop", () => {
    const html = renderToString(
      createElement(ui.EmptyState, {
        title: "Nothing here yet",
        description: "Check back later",
        action: createElement("a", { href: "/x" }, "Go"),
      }),
    );
    expect(html).toContain("Nothing here yet");
    expect(html).toContain("Check back later");
    expect(html).toContain("Go");
  });

  // PrintButton is a client component but its body is just a button;
  // renderToString is enough to confirm it mounts under the barrel.
  it("PrintButton renders its children", () => {
    const html = renderToString(
      createElement(ui.PrintButton, { className: "x", children: "Print this" }),
    );
    expect(html).toContain("Print this");
    expect(html).toContain('class="x"');
  });

  // Skeleton primitives are aria-busy placeholders; assert their
  // accessibility attributes survive the barrel hop.
  it("SkeletonBlock renders with aria-hidden", () => {
    const html = renderToString(
      createElement(ui.SkeletonBlock, { width: "10rem", height: "1rem" }),
    );
    expect(html).toContain('aria-hidden="true"');
  });

  it("SkeletonText renders with role=status and Loading text label", () => {
    const html = renderToString(createElement(ui.SkeletonText, { lines: 2 }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading text"');
  });

  it("SkeletonTable renders with proper table semantics", () => {
    const html = renderToString(createElement(ui.SkeletonTable, { columns: 3, rows: 2 }));
    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain('aria-label="Loading table"');
  });
});
