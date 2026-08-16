/**
 * Round 30 — C-08 contract pin: every <th> ships `scope="col"`, and
 * every admin Astryx <Table> consumer wraps its data in a <figure>
 * with a <figcaption className="sr-only"> caption that supplies the
 * WCAG 1.3.1 accessible name.
 *
 * Mirrors the source-string pattern from rounds 16-29.
 *
 * Audit: docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md C-08 lines 97-102.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

const ALL_TS = [
  // Admin Astryx <Table> consumers
  "src/components/admin/AdminCertificatesTable.tsx",
  "src/components/admin/AdminQuizzesTable.tsx",
  "src/components/astryx/AdminAuditLogTable.tsx",
  "src/components/astryx/AdminBadgesTable.tsx",
  "src/components/astryx/AdminCoursesTable.tsx",
  "src/components/astryx/AdminDiscountCodesTable.tsx",
  "src/components/astryx/AdminLiveClassesTable.tsx",
  "src/components/astryx/AdminPaymentsTable.tsx",
  "src/components/astryx/AdminRefundsTable.tsx",
  "src/components/astryx/AdminResourcesTable.tsx",
  "src/components/astryx/AdminSimulatorsTable.tsx",
  "src/components/astryx/AdminUsersTable.tsx",
  // Tools (parent role="region" aria-label supplies the accessible name)
  "src/components/tools/BidElevatorForm.tsx",
  "src/components/tools/BidElevatorResult.tsx",
  "src/components/tools/KeywordResearchForm.tsx",
  "src/components/tools/StrTriageForm.tsx",
  // Landing tables (no parent aria-label, need their own <caption>)
  "src/components/landing/BidElevator.tsx",
  "src/components/landing/Curriculum.tsx",
  "src/components/landing/Footer.tsx",
] as const;

const ADMIN_ASTRYX_NEEDS_FIGCAPTION = [
  ["src/components/admin/AdminCertificatesTable.tsx", "Certificates"],
  ["src/components/admin/AdminQuizzesTable.tsx", "Quizzes"],
] as const;

const LANDING_NEEDS_CAPTION = [
  [
    "src/components/landing/BidElevator.tsx",
    "Search-term harvest",
  ],
  [
    "src/components/landing/Curriculum.tsx",
    "Curriculum modules",
  ],
  [
    "src/components/landing/Footer.tsx",
    "Project architecture",
  ],
] as const;

const LANDING_NEEDS_SCOPE = [
  "src/components/landing/BidElevator.tsx",
  "src/components/landing/Curriculum.tsx",
  "src/components/landing/Footer.tsx",
] as const;

const TOOLS_NEEDS_SCOPE = [
  "src/components/tools/BidElevatorForm.tsx",
  "src/components/tools/BidElevatorResult.tsx",
  "src/components/tools/KeywordResearchForm.tsx",
  "src/components/tools/StrTriageForm.tsx",
] as const;

describe("round 30 — C-08 tables ship accessible name + scope", () => {
  describe("every <th> in scope files carries scope=\"col\"", () => {
    // For each file, find every <th ...> opening tag (not <thead> or <th/>)
    // and assert each one contains scope="col".
    const thTagRe = /<th\b(?![a-zA-Z])[^>]*>/g;

    for (const file of ALL_TS) {
      it(`${file} has no <th> without scope="col"`, () => {
        const src = SRC(file);
        const matches = [...src.matchAll(thTagRe)];

        // Skip files that have NO <th> tags at all (e.g., Astryx
        // <Table> consumers whose headers are defined via the
        // `header:` field on TableColumn, not as JSX <th>).
        if (matches.length === 0) return;

        for (const m of matches) {
          expect(m[0]).toMatch(/scope="col"/);
        }
      });
    }
  });

  describe("admin Astryx <Table> consumers ship sr-only <figcaption>", () => {
    for (const [file, label] of ADMIN_ASTRYX_NEEDS_FIGCAPTION) {
      it(`${file} wraps its <Table> in <figure> with sr-only figcaption "${label}"`, () => {
        const src = SRC(file);
        // Sanity: the file actually uses Astryx <Table>
        expect(src).toMatch(/from\s+["']@astryxdesign\/core["']/);
        // Wrapped in <figure>
        expect(src).toMatch(/<figure\b/);
        // sr-only figcaption with the expected accessible name
        expect(src).toMatch(
          new RegExp(`<figcaption\\s+className="sr-only">${label}</figcaption>`),
        );
        // M-R30 doc block cites WCAG 1.3.1
        expect(src).toMatch(/WCAG\s+1\.3\.1/);
      });
    }
  });

  describe("landing tables ship sr-only <caption> + scope=\"col\"", () => {
    for (const [file, label] of LANDING_NEEDS_CAPTION) {
      it(`${file} has <caption className="sr-only"> mentioning "${label}"`, () => {
        const src = SRC(file);
        expect(src).toMatch(
          new RegExp(`<caption\\s+className="sr-only">${label}`),
        );
      });
    }

    for (const file of LANDING_NEEDS_SCOPE) {
      it(`${file} has no <th> without scope="col"`, () => {
        const src = SRC(file);
        const matches = [...src.matchAll(/<th\b(?![a-zA-Z])[^>]*>/g)];
        if (matches.length === 0) return;
        for (const m of matches) {
          expect(m[0]).toMatch(/scope="col"/);
        }
      });
    }
  });

  describe("tools tables ship scope=\"col\" + M-R30 doc block", () => {
    for (const file of TOOLS_NEEDS_SCOPE) {
      it(`${file} has scope="col" on every <th> and cites WCAG 1.3.1`, () => {
        const src = SRC(file);
        const matches = [...src.matchAll(/<th\b(?![a-zA-Z])[^>]*>/g)];
        if (matches.length === 0) return;
        for (const m of matches) {
          expect(m[0]).toMatch(/scope="col"/);
        }
        // M-R30 doc block on the table header
        expect(src).toMatch(/M-R30 fix: scope="col"/);
        expect(src).toMatch(/WCAG\s+1\.3\.1/);
      });
    }
  });

  });