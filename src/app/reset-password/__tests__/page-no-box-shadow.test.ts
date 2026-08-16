import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Round 25 — pins the Field Manual §5 contract on the reset-password
 * page card. Source-string assertions only (no CSS module resolution).
 * Mirrors the pattern from rounds 16–24.
 *
 *  - `docs/design-brief.md:142` — "Card: Shadow: none (the border is
 *    the elevation; shadow would fight the manual aesthetic)."
 *  - The reset-password page card already has a 1px `var(--border)` which
 *    is the elevation indicator. A 460px-wide form container does not
 *    need a shadow to read as elevated.
 */

const cssPath = resolve(
  process.cwd(),
  "src/app/reset-password/page.module.css",
);
const css = readFileSync(cssPath, "utf8");

function ruleBody(selector: string): string {
  const re = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, "m");
  const match = css.match(re);
  if (!match) {
    throw new Error(`rule not found: ${selector}`);
  }
  return match[1] ?? "";
}

describe("reset-password page.module.css — Field Manual §5 (round 25)", () => {
  it(".page does NOT declare box-shadow", () => {
    const body = ruleBody(".page");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".page retains the 1px `var(--border)` (the elevation)", () => {
    const body = ruleBody(".page");
    expect(body).toMatch(/border:\s*1px\s+solid\s+var\(--border\)/);
  });

  it("doc block cites Field Manual §5 / design-brief.md / border-elevation", () => {
    expect(css).toMatch(/Field Manual §5/);
    expect(css).toMatch(/docs\/design-brief\.md:142/);
    expect(css).toMatch(/border IS the elevation|elevation indicator/);
  });

  it("sanity sweep: no rule in this file ships `box-shadow: var(--shadow-`", () => {
    expect(css).not.toMatch(/box-shadow:\s*var\(--shadow-/);
  });
});
