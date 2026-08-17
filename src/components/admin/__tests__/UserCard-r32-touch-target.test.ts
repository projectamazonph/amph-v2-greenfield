/**
 * Round 32 — C-05 contract pin: the UserCard logout button meets the
 * WCAG 2.5.5 *Target Size (Minimum)* 44x44 minimum touch target.
 *
 * Audit bullet C-05 (docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md lines 76-81):
 *   "UserCard logout button below 44x44 touch target.
 *    `.logoutButton { width: 30px; height: 30px; }` — far below the 44x44
 *    design brief target. This is the only way to log out from the admin
 *    chrome, so the regression is on a critical path.
 *    Fix: Bump to `min-width: 44px; min-height: 44px;` (use `min-*` to
 *    avoid breaking tight admin layouts) and increase `padding` for the
 *    hit area."
 *
 * The C-05 fix used `min-width: 44px; min-height: 44px;` on
 * `.logoutButton` so the button can grow to fit content but never
 * collapses below 44x44 CSS pixels. This test pins the CSS contract
 * because the rendering dimensions cannot be measured at the React
 * component level (the size is set via CSS module class).
 *
 * WCAG 2.5.5 *Target Size (Minimum)* (Level AA, minimum 24x24 CSS
 * pixels; design brief raises this to 44x44).
 *
 * Mirrors the source-string pattern from rounds 16-31.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const USER_CARD_CSS = "src/components/admin/UserCard.module.css";

function readCss(): string {
  return readFileSync(resolve(process.cwd(), USER_CARD_CSS), "utf8");
}

describe("M-R32: UserCard logout button meets WCAG 2.5.5 44x44 touch target", () => {
  it(".logoutButton declares min-width: 44px", () => {
    const src = readCss();
    expect(src).toMatch(/\.logoutButton\s*\{[\s\S]*?min-width:\s*44px/);
  });

  it(".logoutButton declares min-height: 44px", () => {
    const src = readCss();
    expect(src).toMatch(/\.logoutButton\s*\{[\s\S]*?min-height:\s*44px/);
  });

  it(".logoutButton does NOT use a fixed `width:` or `height:` below 44px (no regression to 30x30)", () => {
    const src = readCss();
    // The pre-fix rule was `width: 30px; height: 30px;`. Pin the
    // contract that those tiny fixed dimensions are gone.
    expect(src).not.toMatch(/\.logoutButton\s*\{[^}]*\bwidth:\s*30px/);
    expect(src).not.toMatch(/\.logoutButton\s*\{[^}]*\bheight:\s*30px/);
  });

  it("ships a focus-visible outline so keyboard users can see the hit area", () => {
    const src = readCss();
    expect(src).toMatch(/\.logoutButton:focus-visible/);
  });
});