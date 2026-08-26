/**
 * Round 32 — C-06 contract pin: ConfirmSubmitButton uses an Astryx
 * <Dialog> (real DOM dialog) instead of `window.confirm()`.
 *
 * Audit bullet C-06 (docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md lines 83-88):
 *   "ConfirmSubmitButton uses native `window.confirm`.
 *    Native `window.confirm()` is implemented by the browser, is not
 *    part of the page DOM, and is not announced reliably by screen
 *    readers in all browsers. It also blocks the main thread, freezes
 *    animation, and cannot be styled to match the simulator interface.
 *    Fix: Replace with a real `<dialog>` (or Astryx `Modal`) backed
 *    by `useState` for open state. Render confirm/cancel buttons with
 *    `type=\"button\"`, focus-trap the modal, restore focus to the
 *    trigger on close."
 *
 * The C-06 fix uses the Astryx `Dialog` primitive (which is a real
 * `<dialog>` under the hood) with `useState` for open state and a
 * `requestSubmit()` flow that defers to the enclosing `<form>`.
 *
 * WCAG 2.1.1 *Keyboard*, WCAG 4.1.2 *Name, Role, Value*.
 *
 * Mirrors the source-string pattern from rounds 16-31.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CONFIRM_BUTTON = "src/components/admin/ConfirmSubmitButton.tsx";

function readComponent(): string {
  return readFileSync(resolve(process.cwd(), CONFIRM_BUTTON), "utf8");
}

describe("M-R32: ConfirmSubmitButton uses Astryx Dialog, not window.confirm (WCAG 2.1.1 / 4.1.2)", () => {
  it("does NOT call window.confirm anywhere", () => {
    const src = readComponent();
    expect(src).not.toMatch(/window\.confirm\s*\(/);
  });

  it("imports the Astryx Dialog primitive", () => {
    const src = readComponent();
    expect(src).toMatch(/from\s+["']@astryxdesign\/core\/Dialog["']/);
  });

  it("renders a <Dialog> element with `purpose=\"required\"` for modal semantics", () => {
    const src = readComponent();
    expect(src).toMatch(/<Dialog\b/);
    expect(src).toMatch(/purpose=["']required["']/);
  });

  it("backed by useState for open/close state (not imperative modal APIs)", () => {
    const src = readComponent();
    expect(src).toMatch(/useState\s*\(\s*false\s*\)/);
    expect(src).toMatch(/setIsOpen/);
  });

  it("Cancel and Confirm buttons are type=\"button\" so they never submit the form unintentionally", () => {
    const src = readComponent();
    // Both action buttons inside the dialog must carry type="button".
    const buttonMatches = src.match(/<button\b[^>]*>/g) ?? [];
    expect(buttonMatches.length).toBeGreaterThanOrEqual(3); // trigger + cancel + confirm
    for (const m of buttonMatches) {
      // The trigger is type="submit"; the two dialog buttons are type="button".
      if (m.includes('type="button"') || m.includes('type="submit"')) continue;
      // Any button without an explicit type is a regression risk.
      throw new Error(
        `Button missing explicit type attribute: ${m}`,
      );
    }
  });

  it("calls form.requestSubmit() to defer the submit to the enclosing <form action=...>", () => {
    const src = readComponent();
    expect(src).toMatch(/form\.requestSubmit\s*\(\s*\)/);
  });

  it("ships a doc block citing WCAG 4.1.2 (the criterion applied by the C-06 fix)", () => {
    const src = readComponent();
    // The C-06 fix replaced `window.confirm()` with an Astryx Dialog. The
    // doc block cites WCAG 4.1.2 *Name, Role, Value* to anchor the reason
    // for the swap. Pin it so a future agent does not regress the citation.
    expect(src).toMatch(/4\.1\.2/);
  });
});