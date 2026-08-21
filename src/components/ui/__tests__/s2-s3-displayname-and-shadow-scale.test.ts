/**
 * Round 35 — pin the S-2 + S-3 contracts from the 2026-08-20 audit.
 *
 * Umbrella #404, children #406 (displayName) and #407 (shadow scale).
 *
 * S-2: every exported component in src/components/ui/ has an explicit
 *      `Component.displayName = "ComponentName"` assignment, so React
 *      DevTools shows the proper name instead of `Anonymous` or
 *      `ForwardRef`. (Input's named function arg to forwardRef already
 *      inferred its name; the explicit assignment there is for
 *      consistency, not for the bug fix.)
 *
 * S-3: only one shadow-token scale is used in the codebase. The
 *      canonical scale is --shadow-sm / --shadow-md / --shadow-lg,
 *      defined in src/app/globals.css and used by every caller. The
 *      legacy --shadow-low / --shadow-med / --shadow-high scale
 *      (Astryx-aligned, defined in src/themes/amph-theme.ts) was
 *      never adopted by any caller and was removed in this round.
 *
 * This test pins both invariants. If either regresses, the build
 * fails.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

// Every component we expect to ship a displayName. Skeleton's named
// exports are listed individually because the S-2 work tagged each one.
const UI_FILES = [
  "src/components/ui/Badge.tsx",
  "src/components/ui/Breadcrumb.tsx",
  "src/components/ui/Button.tsx",
  "src/components/ui/Card.tsx",
  "src/components/ui/CommandPalette.tsx",
  "src/components/ui/ConfirmDialog.tsx",
  "src/components/ui/EmptyState.tsx",
  "src/components/ui/Input.tsx",
  "src/components/ui/MobileNavToggle.tsx",
  "src/components/ui/PrintButton.tsx",
  "src/components/ui/RouteError.tsx",
  "src/components/ui/ScrollToTop.tsx",
  "src/components/ui/SubmitButton.tsx",
  "src/components/ui/Toast.tsx",
  "src/components/ui/Skeleton.tsx",
];

// Components exported by the Skeleton barrel, each individually tagged.
const SKELETON_COMPONENTS = [
  "SkeletonBlock",
  "SkeletonText",
  "SkeletonRow",
  "SkeletonCard",
  "SkeletonTable",
  "SkeletonStatTile",
  "SkeletonForm",
];

describe("S-2: UI primitives ship explicit displayName (audit 2026-08-20, #406)", () => {
  describe("every primitive file declares at least one Component.displayName", () => {
    for (const rel of UI_FILES) {
      it(`${rel} ships \`.displayName =\``, () => {
        const src = SRC(rel);
        expect(src).toMatch(/\.displayName\s*=\s*"/);
      });
    }
  });

  it("Skeleton tags each of its 7 named exports individually", () => {
    const src = SRC("src/components/ui/Skeleton.tsx");
    for (const name of SKELETON_COMPONENTS) {
      const re = new RegExp(`${name}\\.displayName\\s*=\\s*"${name}"`);
      expect(src, `Skeleton.tsx must declare ${name}.displayName`).toMatch(re);
    }
  });

  it("Toast tags both Toast and ToastContainer", () => {
    const src = SRC("src/components/ui/Toast.tsx");
    expect(src).toMatch(/Toast\.displayName\s*=\s*"Toast"/);
    expect(src).toMatch(/ToastContainer\.displayName\s*=\s*"ToastContainer"/);
  });
});

describe("S-3: single shadow-token scale (audit 2026-08-20, #407)", () => {
  it("no \`var(--shadow-low|med|high)\` reference remains anywhere under src/", () => {
    // Walk every file under src/ and assert none references the legacy
    // Astryx-aligned scale. Mirrors the round-34 H-01 pattern that
    // enforces --font-family-code absence.
    const { execSync } = require("node:child_process");
    let hits = "";
    try {
      hits = execSync(
        'grep -rEn "var\\(--shadow-(low|med|high)\\)" src/ 2>/dev/null || true',
        { cwd: process.cwd() },
      ).toString();
    } catch {
      hits = "";
    }
    expect(hits, hits).toBe("");
  });

  it("amph-theme.ts no longer defines --shadow-low/med/high", () => {
    const src = SRC("src/themes/amph-theme.ts");
    expect(src).not.toMatch(/"--shadow-low"\s*:/);
    expect(src).not.toMatch(/"--shadow-med"\s*:/);
    expect(src).not.toMatch(/"--shadow-high"\s*:/);
  });

  it("amph-theme.ts comment block lists the canonical sm/md/lg scale", () => {
    // The token-contract comment at the top of the tokens block was
    // updated to point at the actual scale in use. Regression here
    // would mean the comment drifted away from the real tokens again.
    const src = SRC("src/themes/amph-theme.ts");
    expect(src).toMatch(/shadow:\s+--shadow-sm,\s+--shadow-md,\s+--shadow-lg/);
  });

  it("the canonical sm/md/lg scale is still defined in globals.css", () => {
    const src = SRC("src/app/globals.css");
    expect(src).toMatch(/--shadow-sm:/);
    expect(src).toMatch(/--shadow-md:/);
    expect(src).toMatch(/--shadow-lg:/);
  });
});
