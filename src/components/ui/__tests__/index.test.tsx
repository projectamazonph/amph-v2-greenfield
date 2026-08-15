/**
 * index.test.ts — locks in the @/components/ui public API surface.
 *
 * Round 6 (M-06) wires Toast through the barrel. This test prevents
 * future barrel edits from accidentally dropping Toast or renaming
 * its exported symbols. Add new exports to the assertions below as
 * the design system grows.
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
