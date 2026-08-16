/**
 * Round 28 — pin the Field Manual §5 contract on the dead `box-shadow`
 * `transition` term removed from button-like student-facing classes.
 *
 * Audit bullet: docs/design-brief.md:142 ("Button: Shadow: none") treats the
 * 1px `var(--border)` as the elevation; the prior code shipped a
 * `, box-shadow var(--duration-fast|base) var(--ease-out)` term inside the
 * `transition` declaration on the design-system Button and 6 button-like
 * classes (`.continueBtn`, `.quizCta` ×2, `.btnPrimary` ×2, `.primary`).
 * The buttons had no `box-shadow` declaration anywhere on the rule, so the
 * `box-shadow` term in the transition was dead code animating nothing.
 * Five of the six buttons also carried a redundant `box-shadow: none;`
 * on `:hover` (a "freeze"), which is removed.
 *
 * This test pins:
 *   1. Each affected rule's `transition` declaration does NOT include a
 *      `box-shadow var(...)` term.
 *   2. Each affected rule's `:hover` declaration does NOT include
 *      `box-shadow: none;` (the freeze).
 *   3. Each fix ships an M-R28 doc block citing Field Manual §5,
 *      `docs/design-brief.md:142`, and "border IS the elevation"
 *      rationale.
 *   4. Sanity sweep: no rule across all 7 files still ships a
 *      `box-shadow var(--shadow-` declaration on a Button-like surface.
 *
 * Mirrors the source-string pattern from rounds 16-27. Tests are co-located
 * in the design-system Button directory because the round's central change
 * is in `src/components/ui/Button.module.css`.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type FixSite = {
  cssPath: string;
  selector: string;
  /** Selector for the `:hover` rule, or `null` if the design system does not
   * ship a dedicated `:hover` override for box-shadow on this button. */
  hoverSelector: string | null;
};

const FIXES: readonly FixSite[] = [
  {
    cssPath: "src/components/ui/Button.module.css",
    selector: ".btn",
    hoverSelector: null,
  },
  {
    cssPath: "src/app/dashboard/page.module.css",
    selector: ".continueBtn",
    hoverSelector: ".continueBtn:hover",
  },
  {
    cssPath: "src/app/courses/[slug]/page.module.css",
    selector: ".quizCta",
    hoverSelector: ".quizCta:hover",
  },
  {
    cssPath: "src/app/courses/[slug]/lessons/LessonContent.module.css",
    selector: ".quizCta",
    hoverSelector: ".quizCta:hover",
  },
  {
    cssPath: "src/app/profile/page.module.css",
    selector: ".btnPrimary",
    hoverSelector: ".btnPrimary:hover",
  },
  {
    cssPath: "src/app/checkout/checkout-status.module.css",
    selector: ".btnPrimary",
    hoverSelector: ".btnPrimary:hover",
  },
  {
    cssPath: "src/components/student/CourseAccessNotice.module.css",
    selector: ".primary",
    hoverSelector: ".primary:hover",
  },
];

function readCss(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

function ruleBody(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const match = source.match(re);
  if (!match) return "";
  return match[1] ?? "";
}

describe("M-R28: button-like classes ship no dead `box-shadow` transition term (Field Manual §5)", () => {
  for (const fix of FIXES) {
    describe(`${fix.cssPath} \`${fix.selector}\``, () => {
      it("transition declaration does NOT include a `, box-shadow ...` term before its terminating `;`", () => {
        const css = readCss(fix.cssPath);
        const body = ruleBody(css, fix.selector);
        // Bound the match to the same `transition: ...;` declaration by
        // stopping at the first `;`. This excludes the M-R28 doc-block
        // text that names the removed term (it lives past the `;`).
        expect(body).not.toMatch(/transition[^;]*,\s*box-shadow/);
      });

      it("transition declaration does NOT start with `box-shadow ...`", () => {
        const css = readCss(fix.cssPath);
        const body = ruleBody(css, fix.selector);
        // Guards the alternative `transition: box-shadow var(...), background ...`
        // shape. Anchored on `box-shadow` so it cannot accidentally match
        // a comment block (which lives past the transition's `;`).
        expect(body).not.toMatch(/transition[^;]*box-shadow\s+var\(--duration-/);
      });

      if (fix.hoverSelector !== null) {
        it("`:hover` declaration does NOT include the freeze `box-shadow: none;`", () => {
          const css = readCss(fix.cssPath);
          const body = ruleBody(css, fix.hoverSelector as string);
          expect(body).not.toMatch(/box-shadow\s*:\s*none\s*;/);
        });
      }

      it("doc block cites Field Manual §5 / design-brief.md:142 / border-elevation", () => {
        const css = readCss(fix.cssPath);
        const blocks = css.match(/\/\*\s*M-R28 fix[\s\S]*?\*\//g) ?? [];
        expect(blocks.length).toBeGreaterThanOrEqual(1);
        for (const block of blocks) {
          expect(block).toMatch(/Field Manual\s*§\s*5/);
          expect(block).toMatch(/docs\/design-brief\.md:142/);
          expect(block).toMatch(/border\s+is\s+the\s+elevation/i);
        }
      });
    });
  }

  it("sanity sweep: no rule across the 7 affected files ships `box-shadow: var(--shadow-` on a Button-like surface", () => {
    const offenders: string[] = [];
    for (const fix of FIXES) {
      const css = readCss(fix.cssPath);
      const re = /([.#][\w-]+(?:[^{]*?))\s*\{([^}]*box-shadow\s*:\s*var\(--shadow-[\w-]+\s*;[^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(css)) !== null) {
        const selector = (m[1] ?? "").trim();
        offenders.push(`${fix.cssPath}: ${selector}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});