/**
 * M-R20: tools `.card` honors Field Manual §5 — no box-shadow.
 *
 * Audit bullet: docs/design-brief.md:142 ("Card: …Shadow: none") treats the
 * 1px --border as the elevation; the prior code shipped `box-shadow:
 * var(--shadow-sm)` on `.card` (static), `box-shadow: var(--shadow-md)` on
 * `.card:hover`, and a `transition:` that animated border-color, box-shadow,
 * and transform together. The /tools index is the simulator navigation
 * hub (BidElevator, CampaignBuilder, StrTriage, KeywordResearch,
 * ListingAudit, AdConsole), so its tile cards are a primary student
 * surface. This is the same Field-Manual §5 violation that round 16
 * closed on the catalog card, round 17 closed on the global `.astryx-card`
 * rule, and round 19 closed on the dashboard `.card`.
 *
 * The fix removes `box-shadow` from the `.card`, `.card:hover`, and the
 * transition declaration. The hover treatment stays — the Field-Manual-
 * approved accent-border step (`border-color: var(--accent)`) plus the
 * `translateY(-2px)` lift and the `prefers-reduced-motion: reduce`
 * cancellation block are preserved, so removing the shadow is not traded
 * for a loss of hover affordance.
 *
 * Tests:
 *   1. `.card` does NOT declare `box-shadow` (static state is flat).
 *   2. `.card:hover` does NOT declare `box-shadow` (hover stays flat — the
 *      accent border and translateY lift carry the affordance).
 *   3. The `.card` `transition` line does not animate `box-shadow` (only
 *      border-color and transform). Animating a property that no longer
 *      exists is dead code; the transition is also reduced from three
 *      properties to two.
 *   4. The `--accent` hover border step is preserved (the legitimate
 *      Field Manual §5 hover treatment for primary CTAs).
 *   5. The `translateY(-2px)` hover lift is preserved.
 *   6. The `prefers-reduced-motion` block still cancels the hover transform
 *      (the cancellation block targets `.card:hover`'s `transform`,
 *      confirming the lift itself still exists to be cancelled).
 *   7. The doc block cites Field Manual §5 / design-brief.md /
 *      "border IS the elevation" rationale.
 *   8. Sanity sweep: no rule in this file still ships
 *      `box-shadow: var(--shadow-` on a Card-like surface (excluding focus-
 *      ring `box-shadow: 0 0 0 …` and `box-shadow: none` overrides).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const CSS = path.resolve(process.cwd(), "src/app/tools/page.module.css");

async function readCss(): Promise<string> {
  return fs.readFile(CSS, "utf8");
}

function ruleBody(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const match = source.match(re);
  if (!match) return "";
  const inner = match[1];
  return inner ?? "";
}

describe("M-R20: tools .card honors Field Manual §5 (no box-shadow)", () => {
  it(".card does NOT declare box-shadow (static state is flat)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".card:hover does NOT declare box-shadow (hover stays flat)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card:hover");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".card transition does NOT include box-shadow (border-color + transform only)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card");
    expect(body).toMatch(/transition[^;]*border-color/);
    expect(body).toMatch(/transition[^;]*transform/);
    expect(body).not.toMatch(/transition[^;]*box-shadow/);
  });

  it("--accent hover border step is preserved (Field Manual §5 CTA treatment)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card:hover");
    expect(body).toMatch(/border-color\s*:\s*var\(--accent\)/);
  });

  it("translateY(-2px) hover lift is preserved", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card:hover");
    expect(body).toMatch(/transform\s*:\s*translateY\(-2px\)/);
  });

  it(
    "prefers-reduced-motion block still cancels the hover lift",
    async () => {
      const source = await readCss();
      // The reduced-motion override lives inside a `@media` block and
      // resets the `.card:hover`'s `transform`. The override only exists to
      // cancel the lift, so its presence implies the lift itself still
      // exists to be cancelled.
      const reducedMotionBlock = source.match(
        /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)\s*\{[\s\S]*?\}\s*\}/,
      );
      expect(reducedMotionBlock).not.toBeNull();
      expect(reducedMotionBlock![0]).toMatch(/\.card:hover\s*\{[\s\S]*?transform\s*:\s*none/);
    },
  );

  it("doc block cites Field Manual §5 / design-brief.md / border-elevation", async () => {
    const source = await readCss();
    const cardCommentMatch = source.match(/\/\*\s*M-R20 fix[\s\S]*?\*\//);
    expect(cardCommentMatch).not.toBeNull();
    const comment = cardCommentMatch![0];
    expect(comment).toMatch(/Field Manual\s*§\s*5/);
    expect(comment).toMatch(/design-brief\.md:142/);
    expect(comment).toMatch(/border\s+is\s+the\s+elevation/i);
  });

  it(
    "sanity sweep: no rule in this file ships box-shadow: var(--shadow- on a Card-like surface",
    async () => {
      const source = await readCss();
      const cardStyleOffenders: string[] = [];
      const re = /([.#][\w-]+(?:[^{]*?))\s*\{([^}]*box-shadow\s*:\s*var\(--shadow-[\w-]+\s*;[^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source)) !== null) {
        const selector = (m[1] ?? "").trim();
        cardStyleOffenders.push(selector);
      }
      expect(cardStyleOffenders).toEqual([]);
    },
  );
});
