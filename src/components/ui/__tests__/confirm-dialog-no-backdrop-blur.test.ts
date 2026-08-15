/**
 * confirm-dialog-no-backdrop-blur.test.ts — Field Manual §6 regression guard
 * for the `.dialog::backdrop` rule in
 * `src/components/ui/ConfirmDialog.module.css`.
 *
 * `docs/design-brief.md` lines 15-16 ("What This Is NOT") explicitly bans
 * glassmorphism and gradient orbs. The same design brief's elevation
 * doctrine treats the 1px border as the only elevation cue, and it
 * rejects decorative blurs on top of dim backgrounds. The original
 * `.dialog::backdrop { background: rgba(20,20,20,0.5); backdrop-filter:
 * blur(2px); }` shipped exactly the kind of decorative blur the brief
 * bans, so every confirmation dialog rendered via this component (today:
 * the student sign-out flow in `src/components/student/StudentSidebar.tsx`,
 * and any future destructive-confirmation admin flow) carried a forbidden
 * filter. The fix removes `backdrop-filter: blur(2px)` and leaves the
 * dim layer alone to separate the dialog from the page.
 *
 * This test pins the regression. It reads `ConfirmDialog.module.css` as
 * text and asserts:
 *
 *   1. The `.dialog::backdrop` rule does NOT declare `backdrop-filter:` so
 *      design-brief.md §6 holds on every ConfirmDialog render.
 *   2. The `.dialog::backdrop` rule still declares the `background:`
 *      dim layer so the dialog remains visually separated from the
 *      page behind it (we did not trade the blur for a missing
 *      separator).
 *   3. The leading comment block and the inline `M-R18 fix` comment both
 *      reference the Field Manual §6 / design-brief.md source so future
 *      visual polish passes do not silently re-add the blur.
 *   4. No other CSS module under `src/components/ui/` still ships a
 *      `backdrop-filter` blur (sanity sweep; the previous MobileNavToggle
 *      instance was removed in round 9 — see
 *      MobileNavToggle.module.css:37-38). This guards against a future
 *      contributor copy-pasting the old pattern back into another
 *      primitive.
 *
 * Mirrors the source-string assertion pattern used for the round-17
 * `globals.css .astryx-card` shadow contract and the earlier rounds
 * (round 14 skip-link target, round 15 tool-form aria-busy, round 16
 * catalog card shadow). Locks a structural CSS contract that the legacy
 * Vitest renderer cannot exercise at the component level (the dialog
 * itself lives in jsdom-only territory — see
 * `src/components/ui/__tests__/ConfirmDialog.test.tsx`).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("ConfirmDialog.module.css ::backdrop — Field Manual no-blur contract", () => {
  const cssPath = path.resolve(
    process.cwd(),
    "src/components/ui/ConfirmDialog.module.css",
  );

  it("does NOT declare backdrop-filter on .dialog::backdrop", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    // Match the rule body for `.dialog::backdrop { ... }`. The Field
    // Manual §6 forbids backdrop-filter (decorative blur). The dim
    // background alone must separate the dialog from the page.
    const backdropMatch = source.match(/\.dialog::backdrop\s*\{([^}]*)\}/);
    expect(
      backdropMatch,
      "the .dialog::backdrop rule must exist",
    ).not.toBeNull();
    const backdrop = backdropMatch![1];
    expect(backdrop).not.toMatch(/backdrop-filter\s*:/);
  });

  it("keeps the dim background layer on .dialog::backdrop", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    // The Field Manual §6 fix must not have traded the blur for a
    // missing separator. The dialog still needs a visible dim layer
    // so the user can see the page has been displaced by the prompt.
    const backdropMatch = source.match(/\.dialog::backdrop\s*\{([^}]*)\}/);
    expect(backdropMatch).not.toBeNull();
    const backdrop = backdropMatch![1];
    expect(backdrop).toMatch(/background\s*:\s*rgba\(/);
  });

  it("comments reference Field Manual §6 / design-brief.md lines 15-16", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    // The leading comment block and the M-R18 inline comment must both
    // cite the design brief so a future visual-polish pass does not
    // silently re-add the blur.
    expect(source).toMatch(/Field Manual\s*[§\u00a7]\s*6|Field Manual \u00a76/);
    expect(source).toMatch(/design-brief\.md/);
    expect(source).toMatch(/glassmorphism|decorative blurs/);
  });

  it("no other UI primitive CSS module ships a backdrop-filter blur", async () => {
    // Sanity sweep across every CSS module under src/components/ui/.
    // This catches a future regression where another primitive copies
    // the old pattern back into the codebase. The MobileNavToggle fix
    // (round 9) already removed its instance — see
    // MobileNavToggle.module.css:37-38 — and this rule must remain true.
    const uiDir = path.resolve(process.cwd(), "src/components/ui");
    const entries = await fs.readdir(uiDir, { withFileTypes: true });
    const offenders: string[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".module.css")) continue;
      const full = path.join(uiDir, entry.name);
      const text = await fs.readFile(full, "utf8");
      if (/backdrop-filter\s*:\s*[^;}]*blur/i.test(text)) {
        offenders.push(entry.name);
      }
    }
    expect(
      offenders,
      `these UI primitive CSS modules still ship a backdrop-filter blur: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});