/**
 * M-R22: CourseAccessNotice `.card` honors Field Manual §5.
 *
 * Audit bullet: docs/design-brief.md:142 ("Card: ...Shadow: none") treats the
 * 1px --border as the elevation. The `<CourseAccessNotice>` shared component
 * renders a centered Card-style paywall/notice on 4 call sites in the
 * curriculum block — twice on `/courses/[slug]/lessons/[lessonId]` (gated
 * and not-enrolled branches) and twice on `/courses/[slug]/quizzes/[quizId]`
 * (gated and not-enrolled branches). The `.card` rule in
 * `CourseAccessNotice.module.css` shipped `box-shadow: var(--shadow-sm)`
 * in addition to its 1px `--border`, fighting the Field Manual contract.
 *
 * This test pins the no-shadow contract on `.card`, confirms the 1px border
 * indicator is preserved, confirms the doc block cites Field Manual §5 /
 * design-brief.md / "border IS the elevation" rationale, and runs a sanity
 * sweep so a future contributor cannot paste a Card-style
 * `box-shadow: var(--shadow-` back into the file. Mirrors the source-string
 * pattern from rounds 16 (catalog card), 17 (astryx-card globals),
 * 19 (dashboard `.card`), 20 (/tools `.card`), and 21
 * (/courses/[slug] `.section` + `.quizItem`).
 *
 * Tests:
 *   1. `.card` does NOT declare `box-shadow` (paywall/notice card is flat).
 *   2. `.card` retains its `border: 1px solid var(--border)` so the
 *      elevation indicator survives the shadow removal.
 *   3. The doc block cites Field Manual §5 / design-brief.md /
 *      "border IS the elevation" rationale.
 *   4. Sanity sweep: no rule in the file ships `box-shadow: var(--shadow-`
 *      on a Card-like surface.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const CSS = path.resolve(
  process.cwd(),
  "src/components/student/CourseAccessNotice.module.css",
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

describe("M-R22: CourseAccessNotice `.card` honors Field Manual §5", () => {
  it(".card does NOT declare box-shadow (paywall/notice card is flat)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".card retains the 1px border as the elevation indicator", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card");
    expect(body).toMatch(/border\s*:\s*1px\s+solid\s+var\(--border\)/);
  });

  it("doc block cites Field Manual §5 / design-brief.md / border-elevation", async () => {
    const source = await readCss();
    const commentMatches = source.match(/\/\*\s*M-R22 fix[\s\S]*?\*\//g) ?? [];
    expect(commentMatches.length).toBeGreaterThanOrEqual(1);
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