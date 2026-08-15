/**
 * M-R21: /courses/[slug] curriculum surfaces honor Field Manual §5.
 *
 * Audit bullet: docs/design-brief.md:142 ("Card: …Shadow: none") treats the
 * 1px --border as the elevation. The course detail page shipped two
 * Card-style `box-shadow: var(--shadow-sm)` declarations on `.section`
 * (the curriculum `<details>` section card) and `.quizItem` (the per-quiz
 * card in the same curriculum block). Both fight the manual aesthetic.
 *
 * This test pins the no-shadow contract on both selectors, confirms the
 * 1px border indicator is preserved, and runs a sanity sweep so a future
 * contributor cannot paste a Card-style `box-shadow: var(--shadow-`
 * back into the file. Mirrors the source-string pattern from rounds 16
 * (catalog card), 17 (astryx-card globals), 19 (dashboard `.card`), and
 * 20 (/tools `.card`).
 *
 * Tests:
 *   1. `.section` does NOT declare `box-shadow` (curriculum section card
 *      static state is flat).
 *   2. `.quizItem` does NOT declare `box-shadow` (per-quiz card is flat).
 *   3. `.section` retains its `border: 1px solid var(--border)` so the
 *      elevation indicator survives the shadow removal.
 *   4. `.quizItem` retains its `border: 1px solid var(--border)` for the
 *      same reason.
 *   5. The doc block cites Field Manual §5 / design-brief.md /
 *      "border IS the elevation" rationale.
 *   6. Sanity sweep: no rule in the file ships `box-shadow: var(--shadow-`
 *      on a Card-like surface (excludes focus rings and `box-shadow: none`
 *      overrides, which are different concerns).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const CSS = path.resolve(
  process.cwd(),
  "src/app/courses/[slug]/page.module.css",
);

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

describe("M-R21: /courses/[slug] curriculum cards honor Field Manual §5", () => {
  it(".section does NOT declare box-shadow (curriculum card static state)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".section");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".quizItem does NOT declare box-shadow (per-quiz card is flat)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".quizItem");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".section retains the 1px border as the elevation indicator", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".section");
    expect(body).toMatch(/border\s*:\s*1px\s+solid\s+var\(--border\)/);
  });

  it(".quizItem retains the 1px border as the elevation indicator", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".quizItem");
    expect(body).toMatch(/border\s*:\s*1px\s+solid\s+var\(--border\)/);
  });

  it("doc block cites Field Manual §5 / design-brief.md / border-elevation", async () => {
    const source = await readCss();
    const commentMatches = source.match(/\/\*\s*M-R21 fix[\s\S]*?\*\//g) ?? [];
    expect(commentMatches.length).toBeGreaterThanOrEqual(2);
    for (const block of commentMatches) {
      expect(block).toMatch(/Field Manual\s*§\s*5/);
      expect(block).toMatch(/design-brief\.md:142/);
      expect(block).toMatch(/border\s+is\s+the\s+elevation/i);
    }
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
