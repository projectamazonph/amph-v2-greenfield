/**
 * astryx-card-shadow-field-manual.test.ts — Field Manual §5 regression guard
 * for the global `.astryx-card` rule in `src/app/globals.css`.
 *
 * The Field Manual design-brief.md:142 says: "Shadow: none (the border is
 * the elevation; shadow would fight the manual aesthetic)". The shared
 * `<Card>` primitive in `src/components/ui/Card.module.css` already drops
 * the default shadow (L7 fix, line 12) and adds a 1px translateY lift on
 * `.interactive:hover`. The global rule in `src/app/globals.css`
 * (formerly lines 207–209) re-added `box-shadow: var(--shadow-sm)` on
 * every `.astryx-card` instance, silently violating the Field Manual §5
 * contract on 12+ Card usages across the student surface (live-classes,
 * profile) and the admin surface (refunds, email-templates).
 *
 * This test pins the regression. It reads `globals.css` as text and asserts:
 *
 *   1. The `.astryx-card` default rule does NOT declare `box-shadow:` so
 *      the design-brief.md:142 contract holds on every Card on every
 *      page (the border remains the elevation).
 *   2. The `[data-variant="transparent"]` block keeps its defensive
 *      `box-shadow: none` guard (the only shadow-related declaration
 *      left in this region, which is a no-op for any consumer that
 *      explicitly opts out of the default).
 *   3. The leading comment block references Field Manual §5 and the
 *      design-brief.md:142 source so future maintainers see the spec
 *      that justifies the absence of a default shadow.
 *   4. The `.interactive:hover` translateY lift is preserved in
 *      `Card.module.css` so the affordance survives the shadow drop.
 *
 * Mirrors the source-string assertion pattern used for the round-16
 * /courses catalog card shadow contract and the round-14 / round-15
 * structural assertions (skip-link target, tool-form aria-busy). Locks
 * a structural CSS contract that the legacy Vitest renderer cannot
 * exercise at the component level.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("globals.css .astryx-card — Field Manual card shadow contract", () => {
  const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
  const cardModuleCssPath = path.resolve(
    process.cwd(),
    "src/components/ui/Card.module.css",
  );

  it("does NOT declare box-shadow on the default .astryx-card rule", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    // Match the rule body for `.astryx-card { ... }` that does NOT carry
    // a [data-variant=...] attribute selector. The default-state rule is
    // the simple class selector — its body must be shadow-free.
    const cardDefaultMatch = source.match(/\.astryx-card\s*\{([^}]*)\}/);
    expect(
      cardDefaultMatch,
      "the .astryx-card default rule must exist",
    ).not.toBeNull();
    const cardDefault = cardDefaultMatch![1];
    expect(cardDefault).not.toMatch(/box-shadow\s*:/);
  });

  it("keeps the defensive [data-variant='transparent'] box-shadow: none override", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const transparentMatch = source.match(
      /\.astryx-card\[data-variant="transparent"\]\s*\{([^}]*)\}/,
    );
    expect(
      transparentMatch,
      "the .astryx-card[data-variant='transparent'] rule must exist",
    ).not.toBeNull();
    const transparentBody = transparentMatch![1];
    expect(transparentBody).toMatch(/box-shadow\s*:\s*none/);
  });

  it("comments reference Field Manual §5 and design-brief.md:142", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    // The Astryx Card overrides block sits immediately before the
    // `.astryx-card {` default rule. Future maintainers need to see the
    // design brief excerpt right next to the rule so they do not
    // re-add a default shadow on the next visual polish pass.
    expect(source).toMatch(/Field Manual.*§5|Field Manual \u00a75/);
    expect(source).toMatch(/design-brief\.md:142/);
  });

  it("preserves the .interactive:hover translateY(-1px) lift in Card.module.css", async () => {
    const source = await fs.readFile(cardModuleCssPath, "utf8");
    // The Field Manual spec allows the hover lift on interactive cards.
    // The shadow drop on globals.css must not have been traded for a
    // loss of the hover affordance — Card.module.css still owns it.
    const interactiveHoverMatch = source.match(
      /\.interactive:hover\s*\{([^}]*)\}/,
    );
    expect(
      interactiveHoverMatch,
      "the .interactive:hover rule must exist in Card.module.css",
    ).not.toBeNull();
    const hoverBody = interactiveHoverMatch![1];
    expect(hoverBody).toMatch(/transform\s*:\s*translateY\(-1px\)/);
    expect(hoverBody).toMatch(/border-color\s*:\s*var\(--ink-300\)/);
  });
});
