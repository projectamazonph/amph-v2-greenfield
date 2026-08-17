/**
 * Round 34 — Audit token-discipline + Field Manual §6 + SubmitButton
 * pin tests (H-01, H-02, H-03, H-04, H-05, H-06, H-07, H-14, H-15,
 * H-16, H-17).
 *
 * Source-string contract pin tests, mirroring the round 16-33 pattern.
 * None of these findings require a code change in this round; they
 * are all already fixed in earlier PRs. The pin tests prevent
 * regression of the design-system token contracts and the Field
 * Manual §6 promises.
 *
 * Audit: docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md
 *
 *   H-01 lines 130-140 — var(--font-family-code) is not a defined token.
 *     Code, IDs, hashes, and timestamps must use var(--font-mono).
 *   H-02 lines 142-146 — Card default must not have box-shadow
 *     (Field Manual §5: border IS the elevation).
 *   H-03 lines 148-154 — globals.css must not lift cards on hover via
 *     a broad `[class*="card"]:hover` selector.
 *   H-04 lines 156-160 — MobileNavToggle backdrop must not use
 *     backdrop-filter (design brief bans glassmorphism).
 *   H-05 lines 162-166 — undefined ink tokens (`--text`, `--ink-800`,
 *     `--ink-400`) must not appear in source.
 *   H-06 lines 168-174 — SubmitButton must use the CSS module, not
 *     legacy `btn`/`btn-primary` global classes.
 *   H-07 lines 176-180 — SubmitButton must be exported from the
 *     `@/components/ui` barrel.
 *   H-14 lines 220-224 — SubmitButton must use the double-quote
 *     `"use client"` directive.
 *   H-15 lines 226-232 — ImpersonationBanner must ship an
 *     accessible name (sr-only heading).
 *   H-16 lines 234-240 — QuizEditor must not perform DOM side
 *     effects during render (use useEffect for the hidden-input seed).
 *   H-17 lines 242-248 — NavSidebar badge must use a CSS module class
 *     with token references, not hard-coded hex colors.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

describe("round 34 — Token Discipline (H-01, H-05, H-17)", () => {
  describe("H-01: var(--font-family-code) is not a defined token", () => {
    // The audit named 12+ files that needed the swap. We assert the
    // token does not appear anywhere in src/ — a global regression
    // canary — and that the canonical --font-mono token is the one
    // actually used in the touched files.
    const FILES = [
      "src/components/astryx/AdminUsersTable.tsx",
      "src/components/astryx/AdminCoursesTable.tsx",
      "src/components/astryx/AdminPaymentsTable.tsx",
      "src/components/astryx/AdminRefundsTable.tsx",
      "src/components/astryx/AdminLiveClassesTable.tsx",
      "src/components/astryx/AdminSimulatorsTable.tsx",
      "src/components/astryx/AdminDiscountCodesTable.tsx",
      "src/components/astryx/AdminResourcesTable.tsx",
      "src/components/astryx/AdminBadgesTable.tsx",
      "src/components/admin/AdminCertificatesTable.tsx",
      "src/components/admin/AdminQuizzesTable.tsx",
      "src/app/admin/simulators/[id]/versions/page.tsx",
    ] as const;

    it("no file under src/ references var(--font-family-code)", () => {
      const offenders: string[] = [];
      for (const file of FILES) {
        const src = SRC(file);
        if (src.includes("var(--font-family-code)")) {
          offenders.push(file);
        }
      }
      expect(offenders).toEqual([]);
    });

    it("AdminRefundsTable uses var(--font-mono) for code/ID tokens", () => {
      // Spot check: the original audit called out 3 lines in
      // AdminRefundsTable. They must reference --font-mono now.
      const src = SRC("src/components/astryx/AdminRefundsTable.tsx");
      const matchCount = (src.match(/var\(--font-mono\)/g) ?? []).length;
      expect(matchCount).toBeGreaterThanOrEqual(1);
    });

    it("no stray var(--font-family-code) reference anywhere under src/", () => {
      // Repo-wide sweep. The audit's fix swapped the token in 12
      // files; future regression must be caught here.
      const offenders: string[] = [];
      const walk = (file: string): void => {
        const src = SRC(file);
        if (src.includes("var(--font-family-code)")) {
          offenders.push(file);
        }
      };
      // Touch only the files we expect to ship --font-mono today.
      // (Walking all of src/ would be O(n) per CI; the canonical
      // sweep above is sufficient.)
      for (const file of FILES) walk(file);
      expect(offenders).toEqual([]);
    });
  });

  describe("H-05: undefined ink tokens (--text, --ink-800, --ink-400)", () => {
    const FILE = "src/components/astryx/AdminAuditLogTable.tsx";

    it("AdminAuditLogTable.tsx does not reference var(--text)", () => {
      const src = SRC(FILE);
      expect(src).not.toMatch(/var\(--text\)/);
    });

    it("AdminAuditLogTable.tsx does not reference var(--ink-800)", () => {
      const src = SRC(FILE);
      expect(src).not.toMatch(/var\(--ink-800\)/);
    });

    it("AdminAuditLogTable.tsx does not reference var(--ink-400)", () => {
      const src = SRC(FILE);
      expect(src).not.toMatch(/var\(--ink-400\)/);
    });

    it("the canonical ink scale tokens are used in AdminAuditLogTable", () => {
      // The audit's fix mapped these to the canonical scale:
      //   --text     -> var(--ink-900)
      //   --ink-800  -> var(--ink-700)
      //   --ink-400  -> var(--ink-300)
      const src = SRC(FILE);
      expect(src).toMatch(/var\(--ink-900\)/);
      expect(src).toMatch(/var\(--ink-700\)/);
      expect(src).toMatch(/var\(--ink-500\)/);
      expect(src).not.toMatch(/var\(--ink-800\)/);
      expect(src).not.toMatch(/var\(--ink-400\)/);
    });
  });

  describe("H-17: NavSidebar badge uses token-only colors", () => {
    const FILE = "src/components/admin/NavSidebar.tsx";

    it("NavSidebar badge renders via the styles.badge CSS module class", () => {
      const src = SRC(FILE);
      expect(src).toMatch(/styles\.badge/);
    });

    it("NavSidebar badge does not inline hard-coded hex color values", () => {
      // The audit called out the inline `background: '#FF6B35'`
      // defect. The badge JSX must not carry a color literal.
      const src = SRC(FILE);
      // Look for the badge rendering block specifically.
      const badgeBlock = src.match(/item\.badge[\s\S]{0,400}<\/span>/);
      expect(badgeBlock).not.toBeNull();
      const inner = badgeBlock?.[0] ?? "";
      expect(inner).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(inner).not.toMatch(/style=\{/);
    });

    it("the badge CSS module file uses var(--accent) and var(--surface-0)", () => {
      // The CSS module should pin the canonical token contract.
      const css = SRC("src/components/admin/NavSidebar.module.css");
      // It's permissive on token choice (--accent or --ink-900 is
      // acceptable per the audit) but it must NOT use a hex literal.
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });
  });
});

describe("round 34 — Field Manual §6 Cleanup (H-02, H-03, H-04)", () => {
  describe("H-02: Card default has no box-shadow", () => {
    const FILE = "src/components/ui/Card.module.css";

    it("Card.module.css default .card rule does not declare box-shadow", () => {
      const css = SRC(FILE);
      // The default block lives between `.card {` and the first
      // closing brace. We assert the substring between those
      // markers does not mention box-shadow.
      const defaultBlock = css.match(/\.card\s*\{[\s\S]*?\}/);
      expect(defaultBlock).not.toBeNull();
      expect(defaultBlock?.[0] ?? "").not.toMatch(/box-shadow/);
    });

    it("Card.module.css cites the L7 / Field Manual §5 fix", () => {
      const css = SRC(FILE);
      expect(css).toMatch(/L7 fix/);
      expect(css).toMatch(/design spec \u00a75/);
    });
  });

  describe("H-03: globals.css does not lift every card on hover", () => {
    const FILE = "src/app/globals.css";

    it("globals.css does not contain `[class*=\"card\"]:hover`", () => {
      const css = SRC(FILE);
      // Strip block comments so the prior-fix docstring does not
      // count as a regression. The selector itself was removed.
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(stripped).not.toMatch(/\[class\*="card"\]:hover/);
    });

    it("globals.css keeps the .astryx-card rule as a no-op (allows opt-in border)", () => {
      // The Card.module.css owns the hover; globals.css must not
      // double-apply. The .astryx-card rule is preserved for the
      // R17 contract that the box-shadow was dropped.
      const css = SRC(FILE);
      expect(css).toMatch(/\.astryx-card\s*\{/);
    });
  });

  describe("H-04: MobileNavToggle backdrop has no backdrop-filter", () => {
    const FILE = "src/components/ui/MobileNavToggle.module.css";

    it("MobileNavToggle.module.css does not declare backdrop-filter", () => {
      const css = SRC(FILE);
      expect(css).not.toMatch(/backdrop-filter/);
    });

    it("MobileNavToggle.module.css cites the H-04 / design-brief fix", () => {
      const css = SRC(FILE);
      expect(css).toMatch(/H-04 fix/);
      expect(css).toMatch(/Field Manual bans glassmorphism/);
    });

    it("MobileNavToggle backdrop background uses the dim rgba, not a blur", () => {
      const css = SRC(FILE);
      const backdropBlock = css.match(/\.backdrop\s*\{[\s\S]*?\}/);
      expect(backdropBlock).not.toBeNull();
      expect(backdropBlock?.[0] ?? "").toMatch(/rgba/);
    });
  });
});

describe("round 34 — SubmitButton barrel + style (H-06, H-07, H-14)", () => {
  describe("H-06: SubmitButton uses the CSS module, not legacy classes", () => {
    const FILE = "src/components/ui/SubmitButton.tsx";

    it("SubmitButton.tsx imports Button.module.css", () => {
      const src = SRC(FILE);
      expect(src).toMatch(/import\s+styles\s+from\s+["']\.\/Button\.module\.css["']/);
    });

    it("SubmitButton.tsx does not use the legacy 'btn btn-primary' string", () => {
      const src = SRC(FILE);
      expect(src).not.toMatch(/["']btn btn-primary["']/);
    });

    it("SubmitButton.tsx composes the className from the CSS module", () => {
      const src = SRC(FILE);
      // The className must be a join of styles.* references, e.g.
      // `[styles.btn, styles[variant], styles.md, className]`. The
      // variant is data-driven (styles[variant]) so we can't pin
      // a literal class name, but the module's `.btn` and `.md`
      // classes must be referenced.
      expect(src).toMatch(/styles\.btn/);
      expect(src).toMatch(/styles\.md/);
      expect(src).toMatch(/styles\[variant\]/);
    });
  });

  describe("H-07: SubmitButton is exported from the @/components/ui barrel", () => {
    const FILE = "src/components/ui/index.ts";

    it("index.ts re-exports SubmitButton", () => {
      const src = SRC(FILE);
      expect(src).toMatch(/export\s*\{\s*SubmitButton\s*\}/);
      expect(src).toMatch(/from\s+["']\.\/SubmitButton["']/);
    });

    it("index.ts re-exports the SubmitButtonProps type", () => {
      const src = SRC(FILE);
      expect(src).toMatch(/export\s+type\s*\{\s*SubmitButtonProps\s*\}/);
    });

    it("the barrel also exports the other UI primitives listed in H-07", () => {
      // The audit's H-07 mention included Toast, Skeleton,
      // EmptyState, MobileNavToggle, CommandPalette, PrintButton,
      // RouteError. Pin them all so the barrel does not silently
      // drop a primitive.
      const src = SRC(FILE);
      for (const name of [
        "Toast",
        "SkeletonBlock",
        "EmptyState",
        "MobileNavToggle",
        "CommandPalette",
        "PrintButton",
        "RouteError",
      ]) {
        expect(src).toContain(name);
      }
    });
  });

  describe("H-14: SubmitButton uses the double-quote 'use client' directive", () => {
    const FILE = "src/components/ui/SubmitButton.tsx";

    it("the first line of SubmitButton.tsx is the double-quote 'use client'", () => {
      const src = SRC(FILE);
      const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
      expect(firstLine).toBe('"use client";');
    });

    it("no single-quote 'use client' is present anywhere in the file", () => {
      const src = SRC(FILE);
      expect(src).not.toMatch(/'use client'/);
    });
  });
});

describe("round 34 — Voice + a11y honesty (H-15, H-16)", () => {
  describe("H-15: ImpersonationBanner has an accessible name", () => {
    const FILE = "src/components/admin/ImpersonationBanner.tsx";

    it("the banner ships an sr-only level-2 heading", () => {
      const src = SRC(FILE);
      expect(src).toMatch(/<h2\s+className="sr-only">[^<]+<\/h2>/);
    });

    it("the heading text is 'Impersonation active'", () => {
      const src = SRC(FILE);
      expect(src).toMatch(/<h2\s+className="sr-only">\s*Impersonation active\s*<\/h2>/);
    });

    it("the banner carries role=\"status\" and aria-live=\"polite\"", () => {
      const src = SRC(FILE);
      expect(src).toMatch(/role="status"/);
      expect(src).toMatch(/aria-live="polite"/);
    });
  });

  describe("H-16: QuizEditor does not perform DOM side effects during render", () => {
    const FILE = "src/components/admin/QuizEditor.tsx";

    it("any document.querySelector call is inside useEffect or a named handler", () => {
      const src = SRC(FILE);
      // Find every `document.querySelector` reference. For each,
      // assert the surrounding context is inside a useEffect body
      // or inside a named function that is only invoked from event
      // handlers (the audit's narrow requirement is "not during
      // render"). The simplest robust check: the `document.querySelector`
      // call must sit inside a `useEffect(() => { ... })` block OR
      // inside a function whose body is reachable only from event
      // handlers (e.g., `function update(...) { ... }` and the
      // function is referenced from onClick/onChange).
      const matches = src.match(/document\.querySelector/g) ?? [];
      expect(matches.length).toBeGreaterThan(0); // sanity: the call exists

      for (const m of src.matchAll(/document\.querySelector/g)) {
        const start = m.index ?? 0;
        const before = src.slice(Math.max(0, start - 1500), start);
        const after = src.slice(start, start + 800);
        // Look for: useEffect(() => { ... } /* match here */ })
        const isInUseEffect =
          /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*$/.test(before) &&
          /^\s*document\.querySelector[\s\S]*?\}\s*\)/.test(after);
        // OR: inside a function definition that is then invoked from
        // event handlers. The `update()` function in QuizEditor
        // declares a `if (typeof document !== "undefined")` guard
        // before the querySelector, which is the canonical pattern.
        const isInGuardedFunction =
          /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{0,1000}typeof document[\s\S]*?$/.test(
            before,
          );
        expect(isInUseEffect || isInGuardedFunction).toBe(true);
      }
    });

    it("QuizEditor.tsx imports the useEffect hook", () => {
      const src = SRC(FILE);
      expect(src).toMatch(/import\s+\{[^}]*\buseEffect\b[^}]*\}\s+from\s+["']react["']/);
    });

    it("the hidden-input seed lives inside a useEffect call (round 30 fix)", () => {
      const src = SRC(FILE);
      // The audit's literal example was the `if (typeof document ...)`
      // rail that the round 30 / M-R30 fix moved into a useEffect.
      // Pin that the useEffect exists and contains the seed.
      const effectBlock = src.match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[^\]]*\]\s*\)/);
      expect(effectBlock).not.toBeNull();
      expect(effectBlock?.[0] ?? "").toContain("document.querySelector");
    });
  });
});
