/**
 * ConfirmDialog.test.tsx — pure unit tests via react-dom/server.
 *
 * Vitest's `environment: "node"` means we can't use @testing-library/react
 * (no DOM, no native <dialog> showModal/close support). Instead we render to
 * a static HTML string with react-dom/server and assert on substrings.
 *
 * The dialog open/close transition depends on the native <dialog> element
 * which only exists in jsdom. Behavioral coverage (click handlers, ESC
 * cancel) is exercised at the integration layer in tests/integration and at
 * the browser layer via Playwright. What we cover here is the markup contract:
 * - Title, description, and button labels render
 * - Destructive variant applies the destructive class token
 * - Cancel label defaults to "Cancel"
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ConfirmDialog } from "../ConfirmDialog";

// CSS Modules produce hashed class names like `_dialog_xyz123` and
// `_confirmDestructive_abc456`. Match the variant as a token in the
// whitespace-separated class list.
function hasClassToken(html: string, token: string): boolean {
  const matches = html.match(/class="([^"]+)"/g) ?? [];
  for (const match of matches) {
    const cls = match.slice("class=\"".length, -1);
    if (cls.split(/\s+/).some((c) => c.includes(token))) return true;
  }
  return false;
}

describe("ConfirmDialog", () => {
  it("renders the title", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Sign out?",
        confirmLabel: "Sign out",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("Sign out?");
  });

  it("renders the description when provided", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Sign out?",
        description: "You will need to sign back in to continue.",
        confirmLabel: "Sign out",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("You will need to sign back in to continue.");
  });

  it("renders the confirm button with the provided label", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Sign out?",
        confirmLabel: "Sign out",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("Sign out");
  });

  it("renders the default Cancel label when cancelLabel is omitted", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Sign out?",
        confirmLabel: "Sign out",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("Cancel");
  });

  it("renders a custom cancelLabel when provided", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Delete?",
        confirmLabel: "Delete",
        cancelLabel: "Keep it",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("Keep it");
  });

  it("applies the destructive variant class when destructive=true", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Delete?",
        confirmLabel: "Delete",
        destructive: true,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(hasClassToken(html, "confirmDestructive")).toBe(true);
  });

  it("applies the confirm (non-destructive) class by default", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Save?",
        confirmLabel: "Save",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(hasClassToken(html, "confirmBtn")).toBe(true);
  });

  it("renders a native <dialog> element", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Test",
        confirmLabel: "OK",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("<dialog");
  });

  it("wires aria-labelledby to the title element", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Test",
        confirmLabel: "OK",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain('aria-labelledby="confirm-dialog-title"');
  });

  it("wires aria-describedby when description is present", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: true,
        title: "Test",
        description: "A description",
        confirmLabel: "OK",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain('aria-describedby="confirm-dialog-desc"');
  });
});
