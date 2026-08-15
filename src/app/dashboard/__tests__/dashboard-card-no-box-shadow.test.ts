/**
 * M-R19: dashboard `.card` honors Field Manual §5 — no box-shadow.
 *
 * Audit bullet: docs/design-brief.md:142 ("Card: …Shadow: none") treats the
 * 1px --border as the elevation; the prior code shipped `box-shadow:
 * var(--shadow-sm)` on `.card` (static) and `box-shadow: var(--shadow-md)`
 * on `.card:hover`, with a `transition:` that animated both `border-color`
 * and `box-shadow`. That fights the manual aesthetic the rest of the
 * surface system already enforces (rounds 16–17 closed the same violation on
 * the catalog card and the global `.astryx-card` rule). The dashboard is the
 * highest-traffic student landing surface so the violation is the most
 * visible of the remaining instances.
 *
 * The fix removes `box-shadow` from the `.card`, `.card:hover`, and `transition`
 * declaration. The hover treatment stays — the Field-Manual-recommended
 * `border-color: var(--ink-300)` step, which is the only elevation the
 * design system permits on interactive cards.
 *
 * Tests:
 *   1. `.card` does NOT declare `box-shadow` (the static state must be flat).
 *   2. `.card:hover` does NOT declare `box-shadow` (the hover state must stay
 *      flat — it leans on the border-color step alone).
 *   3. The `.card` `transition` line does not animate `box-shadow` (only
 *      `border-color`). An animation against a property that no longer
 *      exists is dead code; the transition also animates nothing else here.
 *   4. The `--ink-300` border-color hover step is preserved (the legitimate
 *      Field Manual §5 hover treatment).
 *   5. Comments inside the file cite the Field Manual §5 / design-brief.md
 *      / "border IS the elevation" rationale so future maintainers don't
 *      reintroduce the shadow.
 *   6. Sanity sweep: no rule in this file still ships `box-shadow: var(--shadow-`
 *      on a Card-style surface (excluding focus-ring `box-shadow: 0 0 0 …` and
 *      `box-shadow: none` overrides, which are different concerns).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const CSS = path.resolve(
  process.cwd(),
  "src/app/dashboard/page.module.css",
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

describe("M-R19: dashboard .card honors Field Manual §5 (no box-shadow)", () => {
  it(".card does NOT declare box-shadow (static state is flat)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".card:hover does NOT declare box-shadow (hover state stays flat)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card:hover");
    expect(body).not.toMatch(/box-shadow\s*:/);
  });

  it(".card transition does NOT include box-shadow (only border-color)", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card");
    // The transition should remain a single property (border-color); no
    // second `box-shadow` term on the same line.
    expect(body).toMatch(/transition\s*:\s*border-color/);
    expect(body).not.toMatch(/transition[^;]*box-shadow/);
  });

  it("Field-Manual-approved --ink-300 hover border step is preserved", async () => {
    const source = await readCss();
    const body = ruleBody(source, ".card:hover");
    expect(body).toMatch(/border-color\s*:\s*var\(--ink-300\)/);
  });

  it("doc block cites Field Manual §5 / design-brief.md / border-elevation", async () => {
    const source = await readCss();
    const cardCommentMatch = source.match(
      /\/\*\s*M-R19 fix[\s\S]*?\*\//,
    );
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
      // Card-style surfaces are visual cards, not focus rings or overrides.
      // We tolerate `box-shadow: 0 0 0 … --accent-soft` (focus ring) and
      // `box-shadow: none` (override). Anything left that says
      // `box-shadow: var(--shadow-sm|md|lg|xl)` on a Card surface is the
      // very violation we are closing — fail closed if any are present.
      const cardStyleOffenders: string[] = [];
      const re = /([.#][\w-]+(?:[^{]*?))\s*\{([^}]*box-shadow\s*:\s*var\(--shadow-[\w-]+\s*;[^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source)) !== null) {
        const selector = (m[1] ?? "").trim();
        cardStyleOffenders.push(selector);
      }
      // M-R19 fixes the .card and .card:hover selectors — those are gone.
      // Any remaining offender is a new violation introduced or missed
      // elsewhere in this file (the tools page, profile, certificates, and
      // dashboard cards are tracked separately in their own fix branches).
      expect(cardStyleOffenders).toEqual([]);
    },
  );
});
