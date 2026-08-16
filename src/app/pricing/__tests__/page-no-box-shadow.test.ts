import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Round 26 — pins the Field Manual §5 contract on the pricing tier
 * cards. Source-string assertions only (no CSS module resolution).
 * Mirrors the pattern from rounds 16–25.
 *
 *  - `docs/design-brief.md:142` — "Card: Shadow: none (the border is
 *    the elevation; shadow would fight the manual aesthetic)."
 *  - The pricing `.card` already has a 1px `var(--border)` and the
 *    highlighted variant has a 2px `var(--accent)` border — both are
 *    sufficient elevation indicators. The removed `box-shadow: 0 0 0
 *    4px var(--accent-soft)` halo on `.cardHighlighted` was a shadow
 *    variant; the 2px border remains the highlighted-tier signal.
 */

const cssPath = resolve(process.cwd(), "src/app/pricing/page.module.css");
const css = readFileSync(cssPath, "utf8");

function ruleBody(selector: string): string {
  const re = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, "m");
  const match = css.match(re);
  if (!match) {
    throw new Error(`rule not found: ${selector}`);
  }
  return match[1] ?? "";
}

describe("pricing page.module.css — Field Manual §5 (round 26)", () => {
  it(".card does NOT declare box-shadow", () => {
    const body = ruleBody(".card");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".cardHighlighted does NOT declare box-shadow (the halo is gone)", () => {
    const body = ruleBody(".cardHighlighted");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".card retains the 1px `var(--border)` (the elevation)", () => {
    const body = ruleBody(".card");
    expect(body).toMatch(/border:\s*1px\s+solid\s+var\(--border\)/);
  });

  it(".cardHighlighted retains the 2px `var(--accent)` border (the highlighted-tier indicator)", () => {
    const body = ruleBody(".cardHighlighted");
    expect(body).toMatch(/border:\s*2px\s+solid\s+var\(--accent\)/);
  });

  it("doc block cites Field Manual §5 / design-brief.md / border-elevation", () => {
    expect(css).toMatch(/Field Manual §5/);
    expect(css).toMatch(/docs\/design-brief\.md:142/);
    expect(css).toMatch(/border IS the elevation|elevation indicator/);
  });

  it("sanity sweep: no rule in this file ships `box-shadow: var(--shadow-` or `box-shadow: 0 0 0`", () => {
    expect(css).not.toMatch(/box-shadow:\s*var\(--shadow-/);
    expect(css).not.toMatch(/box-shadow:\s*0 0 0/);
  });
});
