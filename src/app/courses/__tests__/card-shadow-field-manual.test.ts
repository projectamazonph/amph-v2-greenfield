/**
 * card-shadow-field-manual.test.ts — Field Manual §5 regression guard for
 * the /courses catalog card.
 *
 * The Field Manual design-brief.md:142 says: "Shadow: none (the border is
 * the elevation; shadow would fight the manual aesthetic)". The /courses
 * catalog card renders a `<Link>` styled by `page.module.css`'s `.card`
 * class. A previous "no hover lift on course cards" fix (July 31 audit
 * Finding 4) overshot by adding a soft `box-shadow` at rest and a deeper
 * one on hover. That broke the Field Manual contract that cards use the
 * border as the elevation indicator.
 *
 * This test pins the regression. It reads the CSS module as text and
 * asserts:
 *
 *   1. The `.card` rule does not declare `box-shadow:` (default state
 *      must rely on the 1px `--border` for elevation).
 *   2. The `.card:hover` rule does not declare `box-shadow:` (the spec
 *      bans shadows entirely on cards; the only hover affordance is
 *      the border-accent change plus the 1px lift).
 *   3. The `.card:hover` rule does declare `transform: translateY(-2px)`
 *      (the lift is the `.interactive` pattern from the shared
 *      `<Card>` primitive and the only motion the spec allows).
 *   4. The `.card` rule still has `border: 1px solid var(--border)` so
 *      the elevation indicator survives the shadow removal.
 *
 * Mirrors the source-string assertion pattern used for the round-14
 * skip-link target and the round-15 tool-form `aria-busy` wiring —
 * locks a structural contract that the legacy Vitest renderer could
 * not exercise at the component level.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("/courses page — Field Manual card shadow contract", () => {
  const cssPath = path.resolve(process.cwd(), "src/app/courses/page.module.css");

  it("does NOT declare box-shadow on the default .card rule", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    // Slice from `.card {` to the next `}` so we only inspect the default
    // state, not `:hover` or `:focus-visible`.
    const cardDefaultMatch = source.match(/\.card\s*\{([^}]*)\}/);
    expect(cardDefaultMatch, "the .card default rule must exist").not.toBeNull();
    const cardDefault = cardDefaultMatch![1];
    expect(cardDefault).not.toMatch(/box-shadow\s*:/);
  });

  it("does NOT declare box-shadow on the .card:hover rule", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const cardHoverMatch = source.match(/\.card:hover\s*\{([^}]*)\}/);
    expect(cardHoverMatch, "the .card:hover rule must exist").not.toBeNull();
    const cardHover = cardHoverMatch![1];
    expect(cardHover).not.toMatch(/box-shadow\s*:/);
  });

  it("DOES keep the hover lift (transform: translateY(-2px))", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const cardHoverMatch = source.match(/\.card:hover\s*\{([^}]*)\}/);
    expect(cardHoverMatch, "the .card:hover rule must exist").not.toBeNull();
    const cardHover = cardHoverMatch![1];
    expect(cardHover).toMatch(/transform\s*:\s*translateY\(-2px\)/);
  });

  it("DOES keep the 1px border as the elevation indicator", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const cardDefaultMatch = source.match(/\.card\s*\{([^}]*)\}/);
    expect(cardDefaultMatch, "the .card default rule must exist").not.toBeNull();
    const cardDefault = cardDefaultMatch![1];
    // The Field Manual says the border is the elevation. After removing
    // the default box-shadow the only thing still giving the card
    // visual weight is the 1px border line.
    expect(cardDefault).toMatch(/border\s*:\s*1px\s+solid\s+var\(--border\)/);
  });

  it("DOES honor prefers-reduced-motion by cancelling the hover lift", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    // Field Manual §Motion says motion must respect the OS preference.
    // The shared `<Card>` primitive does the same for `.interactive:hover`.
    expect(source).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(source).toMatch(/\.card:hover\s*\{\s*transform\s*:\s*none/);
  });
});
