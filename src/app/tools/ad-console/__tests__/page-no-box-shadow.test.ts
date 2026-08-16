import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Round 27 - pins the Field Manual §5 contract on the ad-console iframe
 * wrapper. Source-string assertions only (no CSS module resolution).
 * Mirrors the pattern from rounds 16-26.
 *
 *  - `docs/design-brief.md:142` - "Card: Shadow: none (the border is
 *    the elevation; shadow would fight the manual aesthetic)."
 *  - The ad-console `.frameWrap` already has a 1px `var(--border)`,
 *    a `var(--radius-lg)` border-radius, and `overflow: hidden` to
 *    clip the iframe inside. The removed `box-shadow: var(--shadow-sm)`
 *    was decorative; the 1px border is the elevation indicator.
 */

const cssPath = resolve(
  process.cwd(),
  "src/app/tools/ad-console/page.module.css",
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

describe("ad-console page.module.css - Field Manual §5 (round 27)", () => {
  it(".frameWrap does NOT declare box-shadow", () => {
    const body = ruleBody(".frameWrap");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".frameWrap retains the 1px `var(--border)` (the elevation)", () => {
    const body = ruleBody(".frameWrap");
    expect(body).toMatch(/border:\s*1px\s+solid\s+var\(--border\)/);
  });

  it(".frameWrap retains the `var(--radius-lg)` border-radius", () => {
    const body = ruleBody(".frameWrap");
    expect(body).toMatch(/border-radius:\s*var\(--radius-lg\)/);
  });

  it(".frameWrap retains `overflow: hidden` (clips the iframe)", () => {
    const body = ruleBody(".frameWrap");
    expect(body).toMatch(/overflow:\s*hidden/);
  });

  it("doc block cites Field Manual §5 / design-brief.md / border-elevation", () => {
    expect(css).toMatch(/Field Manual §5/);
    expect(css).toMatch(/docs\/design-brief\.md:142/);
    expect(css).toMatch(/border IS the|elevation indicator/);
  });

  it("sanity sweep: no rule in this file ships `box-shadow: var(--shadow-`", () => {
    expect(css).not.toMatch(/box-shadow:\s*var\(--shadow-/);
  });
});