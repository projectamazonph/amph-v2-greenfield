import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");
const SCRIPT = resolve(ROOT, "scripts/seed-learn-050-resources.ts");
const PACKAGE_JSON = resolve(ROOT, "package.json");
const PACK_DIR = resolve(ROOT, "public/downloads/job-ready-pack");

/**
 * Static + filesystem smoke checks for the LEARN-050 seeder.
 *
 * Why this shape: the seed script imports `@/infra/database/prisma`
 * directly (same as the other seed scripts), so we can't easily run it
 * in Vitest without a real database. The actual idempotency is
 * covered indirectly by `CreateResource` and `updateResource` use
 * case tests; what this suite pins is the file-system-level
 * configuration an operator needs to make the seeder land.
 */

const EXPECTED_IDS = [
  "res_jrp_campaign_preflight",
  "res_jrp_keyword_scoring_worksheet",
  "res_jrp_weekly_client_report",
  "res_jrp_negative_keyword_log",
  "res_jrp_acos_bid_calculator",
  "res_jrp_ppc_account_onboarding_sop",
];

const EXPECTED_FILES = [
  "campaign-pre-flight-checklist.md",
  "keyword-scoring-worksheet.md",
  "weekly-client-report.md",
  "negative-keyword-log.md",
  "acos-bid-calculator.md",
  "ppc-account-onboarding-sop.md",
];

const SHIPPED_ANCHORS: Record<string, string | null> = {
  res_jrp_campaign_preflight: "4.3-campaign-structure",
  res_jrp_keyword_scoring_worksheet: "2.2-keyword-research-workflow",
  res_jrp_weekly_client_report: null,
  res_jrp_negative_keyword_log: "2.3-negative-keywords",
  res_jrp_acos_bid_calculator: "1.3-acos-tacos-profitability",
  res_jrp_ppc_account_onboarding_sop: "0.5-client-onboarding",
};

describe("seed-learn-050-resources", () => {
  it("the seeder script exists", () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it("declares every LEARN-050 resource by id (idempotency key)", () => {
    const source = readFileSync(SCRIPT, "utf8");
    for (const id of EXPECTED_IDS) {
      expect(source).toContain(`id: "${id}"`);
    }
  });

  it("uses the domain createResource + updateResource factories so field validation runs", () => {
    const source = readFileSync(SCRIPT, "utf8");
    expect(source).toContain("createResource(");
    expect(source).toContain("updateResource(");
  });

  it("sets createdById to a recognisable constant so the audit trail is consistent", () => {
    const source = readFileSync(SCRIPT, "utf8");
    expect(source).toContain('createdById: "system:learn-050"');
  });

  it("exposes a --dry-run flag for safe previews", () => {
    const source = readFileSync(SCRIPT, "utf8");
    expect(source).toContain('"dry-run"');
  });

  it("is registered as an npm script", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["db:seed:learn-050-resources"]).toBe(
      "tsx scripts/seed-learn-050-resources.ts",
    );
  });

  it("every shipped file exists in public/downloads/job-ready-pack/", () => {
    for (const filename of EXPECTED_FILES) {
      const path = resolve(PACK_DIR, filename);
      expect(existsSync(path)).toBe(true);
    }
  });

  it("the shipped files are not empty (real content, not placeholder text)", () => {
    for (const filename of EXPECTED_FILES) {
      const path = resolve(PACK_DIR, filename);
      const contents = readFileSync(path, "utf8");
      // Each shipped file is at least a few hundred bytes of real
      // markdown. We do not pin exact size here — that would couple
      // the test to prose choices — only that it is non-trivial.
      expect(contents.length).toBeGreaterThan(400);
    }
  });

  it("the three shipped resources have a Worked example block", () => {
    const shipped = [
      "campaign-pre-flight-checklist.md",
      "keyword-scoring-worksheet.md",
      "weekly-client-report.md",
    ];
    for (const filename of shipped) {
      const contents = readFileSync(resolve(PACK_DIR, filename), "utf8");
      // We do not pin the exact heading text (Worked Example vs
      // Worked example) — only that some worked-style block shows
      // up. This is enough to fail the suite if a future edit
      // accidentally drops the worked copy.
      expect(contents.toLowerCase()).toMatch(/worked example/);
    }
  });

  it("the three shipped resources have a blank working copy", () => {
    const shipped = [
      "campaign-pre-flight-checklist.md",
      "keyword-scoring-worksheet.md",
      "weekly-client-report.md",
    ];
    for (const filename of shipped) {
      const contents = readFileSync(resolve(PACK_DIR, filename), "utf8");
      // Same flexibility as the worked-example test. Both blocks
      // must appear so a future edit that drops the blank copy
      // fails the suite, even if the wording changes.
      expect(contents.toLowerCase()).toMatch(/blank working copy/);
    }
  });

  it("the three placeholder resources are clearly marked as in progress", () => {
    const placeholders = [
      "negative-keyword-log.md",
      "acos-bid-calculator.md",
      "ppc-account-onboarding-sop.md",
    ];
    for (const filename of placeholders) {
      const contents = readFileSync(resolve(PACK_DIR, filename), "utf8");
      expect(contents.toLowerCase()).toContain("in progress");
    }
  });

  it("every resource pins the right associatedLessonSlug in the seeder", () => {
    const source = readFileSync(SCRIPT, "utf8");
    for (const [id, slug] of Object.entries(SHIPPED_ANCHORS)) {
      if (slug === null) {
        // Cross-cutting resource: the seeder must spell out `null`,
        // not leave the field empty (which would make the field
        // ambiguous in source).
        const anchorMatcher = new RegExp(
          `id:\\s*"${id}"[\\s\\S]*?associatedLessonSlug:\\s*null`,
        );
        expect(source).toMatch(anchorMatcher);
      } else {
        const anchorMatcher = new RegExp(
          `id:\\s*"${id}"[\\s\\S]*?associatedLessonSlug:\\s*"${slug}"`,
        );
        expect(source).toMatch(anchorMatcher);
      }
    }
  });
});