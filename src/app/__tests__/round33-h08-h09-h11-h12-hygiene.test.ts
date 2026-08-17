/**
 * Round 33 — Audit-closeout hygiene sweep (H-08, H-09, H-11, H-12).
 *
 * Source-string contract pin tests, mirroring the round 16-32 pattern.
 *
 * Audit: docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md
 *   H-08 lines 179-184 — internal route changes use `next/link`, not raw `<a href="/...">`
 *   H-09 lines 186-190 — QuizPlayer /dashboard back link uses `<Link>`
 *   H-11 lines 190-194 — no em-dash in StrTriageForm score line (voice guide)
 *   H-12 lines 196-200 — no `⚠` emoji in ImpersonationBanner (voice guide)
 *
 * For H-08, the round 33 source fix swaps the two remaining raw `<a>` route
 * changes for `<Link>`:
 *   - src/app/admin/audit-log/page.tsx   `<a href="/admin/audit-log">` → `<Link>`
 *   - src/app/verify-email/sent/page.tsx `<a href="/login">`             → `<Link>`
 *
 * The export download on audit-log (`<a href={exportUrl} download>`) keeps
 * a raw `<a>` because the `download` attribute is only honored on real
 * anchor elements, and the in-page anchors on landing/Footer.tsx keep raw
 * `<a>` per the audit's own guidance.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

const FILES = [
  // H-08 fixed in this round
  "src/app/admin/audit-log/page.tsx",
  "src/app/verify-email/sent/page.tsx",
  // H-08 + H-09 audited (Footer / TopBar / Hero / QuizPlayer) — all
  // already ship <Link> for internal routes; pin the contract.
  "src/components/landing/Footer.tsx",
  "src/components/landing/TopBar.tsx",
  "src/components/landing/Hero.tsx",
  "src/components/courses/QuizPlayer.tsx",
] as const;

const ROUTE_CHANGE_FILES = [
  ["src/app/admin/audit-log/page.tsx", "/admin/audit-log"],
  ["src/app/verify-email/sent/page.tsx", "/login"],
] as const;

// Every audited file imports `Link` from "next/link" — that proves the
// file is using the canonical Next.js Link primitive rather than
// rolling its own <a> for route changes.
const LINK_IMPORT_NEEDED = [
  "src/app/admin/audit-log/page.tsx",
  "src/app/verify-email/sent/page.tsx",
  "src/components/landing/Footer.tsx",
  "src/components/landing/TopBar.tsx",
  "src/components/landing/Hero.tsx",
  "src/components/courses/QuizPlayer.tsx",
] as const;

describe("round 33 — H-08 + H-09 next/link contract", () => {
  describe("every audited file imports Link from next/link", () => {
    for (const file of LINK_IMPORT_NEEDED) {
      it(`${file} imports Link from "next/link"`, () => {
        const src = SRC(file);
        expect(src).toMatch(/from\s+["']next\/link["']/);
      });
    }
  });

  describe("H-08: internal route changes use <Link>, not <a href=\"/...\">", () => {
    // The 2 fixed routes must use <Link href="/..."> and must NOT carry
    // a raw <a href="/admin/audit-log"> or <a href="/login">.
    for (const [file, route] of ROUTE_CHANGE_FILES) {
      it(`${file} uses <Link href="${route}"> for the internal route change`, () => {
        const src = SRC(file);
        // Has <Link href={route}> in the JSX
        expect(src).toMatch(new RegExp(`<Link\\b[^>]*href=["']${route}["']`));
        // Has no raw <a href="/route"...> opening tag for the same route
        expect(src).not.toMatch(
          new RegExp(`<a\\b[^>]*href=["']${route}["'][^>]*>`),
        );
      });

      it(`${file} cites the M-R31 / H-08 contract in a comment`, () => {
        const src = SRC(file);
        expect(src).toMatch(/M-R31 fix/);
        expect(src).toMatch(/H-08/);
      });
    }
  });

  describe("H-09: QuizPlayer /dashboard back link uses <Link>", () => {
    it("src/components/courses/QuizPlayer.tsx uses <Link href=\"/dashboard\">", () => {
      const src = SRC("src/components/courses/QuizPlayer.tsx");
      expect(src).toMatch(/<Link\b[^>]*href=["']\/dashboard["']/);
      expect(src).not.toMatch(/<a\b[^>]*href=["']\/dashboard["']/);
    });
  });

  describe("sanity: no raw <a> for internal routes in audited files", () => {
    // Walk every audited file and assert no `<a href="/something">`
    // opening tag (the route-change anti-pattern). This is the
    // canonical anti-pattern that triggers the audit's "full page
    // navigation" defect.
    //
    // We deliberately allow:
    //   - `<a href="#anchor">` (in-page anchor; Next.js Link
    //     doesn't do anchor-scroll on internal routes anyway, and
    //     plain <a> is the canonical in-page anchor element)
    //   - `<a href="https://...">` (external link)
    //   - `<a href="mailto:...">` / `<a href="tel:...">`
    //   - `<a href={COURSES_URL} target="_blank">` (external)
    //   - `<a href={exportUrl} download>` (file download endpoint
    //     that Next.js Link can't handle)
    //   - <a href="/..."> inside a JSX comment or string literal
    //
    // The pattern matches `<a ... href="/<something>"` (i.e. an
    // href starting with `/` followed by a path char, not `#` or
    // protocol). False positives are filtered out by the per-file
    // context below.

    const INTERNAL_A = /<a\b[^>]*\bhref=["']\/([^"']+)["'][^>]*>/g;

    // Manually-categorized list of `<a href="/..."` that are correct
    // (per the audit's own guidance line 184) or are in non-JSX prose.
    // Every other `<a href="/..."` should be flagged.
    const ALLOWED_INTERNAL_A: Record<string, Set<string>> = {
      "src/app/admin/audit-log/page.tsx": new Set(), // none — both routes are now <Link>
      "src/app/verify-email/sent/page.tsx": new Set(),
      "src/components/landing/Footer.tsx": new Set(),
      "src/components/landing/TopBar.tsx": new Set(),
      "src/components/landing/Hero.tsx": new Set(),
      "src/components/courses/QuizPlayer.tsx": new Set(),
    };

    it("every <a href=\"/...\"> in audited files is allowed", () => {
      const offenders: string[] = [];
      for (const file of FILES) {
        const src = SRC(file);
        const allowed = ALLOWED_INTERNAL_A[file] ?? new Set();
        for (const m of src.matchAll(INTERNAL_A)) {
          const route = m[1] ?? "";
          // Skip if the match is inside a JSX comment (`{/* ... */}`),
          // which is what the M-R31 fix doc blocks look like.
          const start = m.index ?? 0;
          const context = src.slice(Math.max(0, start - 200), start);
          if (context.includes("{/*")) continue;
          if (!allowed.has(route)) {
            offenders.push(`${file}: <a href="/${route}">`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  });
});

describe("round 33 — H-11 + H-12 voice-guide contract", () => {
  describe("H-11: no em-dash in StrTriageForm score line", () => {
    const SCORE_FILE = "src/components/tools/StrTriageForm.tsx";

    it("the user-facing score line uses a colon (not an em-dash)", () => {
      const src = SRC(SCORE_FILE);
      // The voice guide bans em-dashes in user-facing copy. The score
      // line is the only student-visible string in the file that
      // contains a `Score:` template, so the contract is that the
      // separator between `%` and the comment is a colon (or period),
      // never U+2014.
      const scoreLine = src.match(
        /Score:\s*\{result\.overallScore\}%([^a-zA-Z0-9])\s*\{result\.feedback\.overallComment\}/,
      );
      expect(scoreLine).not.toBeNull();
      const separator = scoreLine?.[1] ?? "";
      expect(separator).not.toBe("\u2014");
    });

    it("H-11 fix comment lives next to the score block", () => {
      const src = SRC(SCORE_FILE);
      // The M-R33 fix comment references the audit + voice guide,
      // and the file does not ship any other em-dash UI copy.
      expect(src).toMatch(/M-R33 fix/);
      expect(src).toMatch(/H-11/);
    });

    it("no em-dash in user-facing JSX templates (comments allowed)", () => {
      const src = SRC(SCORE_FILE);
      // Strip JSX comments (`{/* ... */}`) and JSDoc/CSS-style block
      // comments (`/* ... */`, `// ...`). The voice guide allows
      // em-dashes in code comments (the audit line 234 calls out
      // that JSDoc em-dashes are OK); only JSX-bearing copy must
      // stay em-dash-free.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
        .replace(/^\s*\/\/.*$/gm, ""); // line comments
      const emCount = (stripped.match(/\u2014/g) ?? []).length;
      expect(emCount).toBe(0);
    });
  });

  describe("H-12: no warning emoji in ImpersonationBanner", () => {
    const BANNER_FILE = "src/components/admin/ImpersonationBanner.tsx";

    it("ImpersonationBanner.tsx does not contain the \u26a0 warning emoji", () => {
      const src = SRC(BANNER_FILE);
      expect(src).not.toMatch(/\u26a0/);
    });

    it("ImpersonationBanner imports the Phosphor `Warning` icon as the visual replacement", () => {
      const src = SRC(BANNER_FILE);
      expect(src).toMatch(/from\s+["']@phosphor-icons\/react\/dist\/ssr["']/);
      expect(src).toMatch(/<Warning\b/);
    });

    it("ImpersonationBanner wraps the icon in an aria-hidden span (WCAG 1.1.1)", () => {
      const src = SRC(BANNER_FILE);
      // The icon span carries `aria-hidden` so the Phosphor SVG is
      // decorative; the surrounding `<h2 className="sr-only">` is the
      // accessible name (also pinned by H-15).
      expect(src).toMatch(/aria-hidden/);
      expect(src).toMatch(/<Warning\b/);
    });

    it("H-12 fix comment lives in the file", () => {
      const src = SRC(BANNER_FILE);
      expect(src).toMatch(/M-R33 fix/);
      expect(src).toMatch(/H-12/);
    });
  });
});
