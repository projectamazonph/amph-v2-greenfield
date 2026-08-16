import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Round 24 — pins the Field Manual §5 contract on the certificate
 * milestone card. Source-string assertions only (no CSS module
 * resolution). Mirrors the pattern from rounds 16–23.
 *
 *  - `docs/design-brief.md:142` — "Card: Shadow: none (the border is
 *    the elevation; shadow would fight the manual aesthetic)."
 *  - The certificate card already has a 4px `var(--info)` border which
 *    is the elevation indicator. Adding a hover shadow would fight
 *    that signal.
 */

const cssPath = resolve(
  process.cwd(),
  "src/app/certificates/[hash]/page.module.css",
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

describe("certificates/[hash] page.module.css — Field Manual §5 (round 24)", () => {
  it(".certCard does NOT declare box-shadow", () => {
    const body = ruleBody(".certCard");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".certCard :hover does NOT declare box-shadow", () => {
    const body = ruleBody(".certCard:hover");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".certCard retains the 4px `var(--info)` border (the elevation)", () => {
    const body = ruleBody(".certCard");
    expect(body).toMatch(/border:\s*4px\s+solid\s+var\(--info\)/);
  });

  it(".certCard transition list drops the `box-shadow` property", () => {
    const body = ruleBody(".certCard");
    const transitionLine = body
      .split(/\r?\n/)
      .find((line) => line.includes("transition:"));
    expect(transitionLine, "transition: line present").toBeDefined();
    expect(transitionLine ?? "").not.toMatch(/box-shadow/);
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
