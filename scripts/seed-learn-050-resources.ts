/**
 * scripts/seed-learn-050-resources.ts
 *
 * Seeds the LEARN-050 job-ready resource pack — the first six entries
 * from `docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md` (LEARN-050):
 *
 *   1. Campaign pre-flight checklist       (shipped, anchor: 4.3)
 *   2. Keyword scoring worksheet           (shipped, anchor: 2.2)
 *   3. Weekly client report                (shipped, cross-cutting)
 *   4. Negative keyword log                (placeholder, anchor: 2.3)
 *   5. ACoS / bid calculator               (placeholder, anchor: 1.3)
 *   6. PPC account onboarding SOP          (placeholder, anchor: 0.5)
 *
 * The three shipped resources each have a real worked example and a
 * blank working copy under `public/downloads/job-ready-pack/*.md`. The
 * three placeholder resources have a short "in progress" markdown file
 * so the listing shows the right title, description, and tier without
 * claiming a worked example it does not have yet. The 3-of-6 cut is
 * honest: every shipped row has a real .md; every placeholder row is
 * explicitly marked as in progress.
 *
 * Idempotent. Re-running upserts by a fixed `id` instead of creating
 * duplicates. The fixed ids are namespaced under `res_jrp_*` to keep
 * them distinct from the STORY-098 / STORY-099 resources in
 * `scripts/seed-resources.ts`.
 *
 * Usage:
 *   pnpm tsx scripts/seed-learn-050-resources.ts            # seed resources
 *   pnpm tsx scripts/seed-learn-050-resources.ts --dry-run  # print what would happen
 *
 * Requires DATABASE_URL in .env.local. Run after `pnpm prisma migrate deploy`.
 */

import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { prisma } from "@/infra/database/prisma";
import { PrismaResourceRepository } from "@/infra/repositories/PrismaResourceRepository";
import {
  createResource,
  updateResource,
  type ResourceCategory,
  type ResourceFileType,
} from "@/domain/entities/Resource";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";

// ── .env loader (same convention as the other scripts/ seeders) ────────────

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf-8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set. Check .env.local or .env.");
  process.exit(1);
}

// ── Resource definitions ────────────────────────────────────────────────────

interface ResourceDef {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  fileType: ResourceFileType;
  fileUrl: string;
  accessTier: CourseAccessTier;
  /**
   * LEARN-050: anchor lesson slug, null for cross-cutting resources.
   * Lesson slugs must follow the `WorksheetLessonSlug` shape
   * (`-1.1-…`, `0.5-…`, `1.3-…`, `2.2-…`, `2.3-…`, `4.3-…`). The
   * domain factory trims and normalises; no FK enforces the slug
   * because the curriculum lives in MDX, not the Prisma schema.
   */
  associatedLessonSlug: string | null;
}

const RESOURCES: ResourceDef[] = [
  {
    id: "res_jrp_campaign_preflight",
    title: "Campaign Pre-Flight Checklist",
    description:
      "Run this 6-section pre-launch checklist on every new Sponsored Products campaign before any spend turns on. Worked example walks through a real auto-water-bottle launch; blank copy is yours to print.",
    category: "template",
    fileType: "md",
    fileUrl: "/downloads/job-ready-pack/campaign-pre-flight-checklist.md",
    accessTier: "STARTER",
    associatedLessonSlug: "4.3-campaign-structure",
  },
  {
    id: "res_jrp_keyword_scoring_worksheet",
    title: "Keyword Scoring Worksheet",
    description:
      "Score a keyword on intent, volume, competition, and listing fit before adding it to a Sponsored Products ad group. Worked example scores five real keywords from a 32oz water bottle Brand Analytics report.",
    category: "template",
    fileType: "md",
    fileUrl: "/downloads/job-ready-pack/keyword-scoring-worksheet.md",
    accessTier: "STARTER",
    associatedLessonSlug: "2.2-keyword-research-workflow",
  },
  {
    id: "res_jrp_weekly_client_report",
    title: "Weekly Client Report",
    description:
      "A one-page Monday-morning client update with eight core metrics, a what-changed section, a what-the-numbers-say paragraph, and a this-week plan. Worked example uses last week's actual Acme Co. numbers.",
    category: "template",
    fileType: "md",
    fileUrl: "/downloads/job-ready-pack/weekly-client-report.md",
    accessTier: "STARTER",
    // Cross-cutting resource: weekly reports draw on every module,
    // not a single anchor lesson. The chip on the listing page
    // hides for this row.
    associatedLessonSlug: null,
  },
  {
    id: "res_jrp_negative_keyword_log",
    title: "Negative Keyword Log",
    description:
      "A running log of every negative exact and negative phrase added across campaigns, sorted by source. In progress — placeholder shipped so the listing is honest about what is here now and what is coming.",
    category: "template",
    fileType: "md",
    fileUrl: "/downloads/job-ready-pack/negative-keyword-log.md",
    accessTier: "STARTER",
    associatedLessonSlug: "2.3-negative-keywords",
  },
  {
    id: "res_jrp_acos_bid_calculator",
    title: "ACoS / Bid Calculator",
    description:
      "An ACoS calculator the VA fills in per ASIN: average sale value, profit margin before ads, break-even ACoS, target ACoS, and implied max CPC at the target conversion rate. In progress — placeholder shipped now.",
    category: "automation_tool",
    fileType: "md",
    fileUrl: "/downloads/job-ready-pack/acos-bid-calculator.md",
    accessTier: "STARTER",
    associatedLessonSlug: "1.3-acos-tacos-profitability",
  },
  {
    id: "res_jrp_ppc_account_onboarding_sop",
    title: "PPC Account Onboarding SOP",
    description:
      "A repeatable SOP for day one of every new client engagement: access tier confirmation, two-factor setup, billing ownership, escalation contacts, reporting template pick, and the first-week checklist. In progress — placeholder shipped now.",
    category: "handout",
    fileType: "md",
    fileUrl: "/downloads/job-ready-pack/ppc-account-onboarding-sop.md",
    accessTier: "PREVIEW",
    associatedLessonSlug: "0.5-client-onboarding",
  },
];

// ── Upsert logic ─────────────────────────────────────────────────────────────

async function upsertResource(def: ResourceDef, repo: PrismaResourceRepository): Promise<boolean> {
  const existing = await repo.findById(def.id);

  if (!existing.ok) {
    console.error(`  [ERROR] Failed to look up "${def.id}":`, existing.error);
    return false;
  }

  if (existing.value !== null) {
    const updated = updateResource(existing.value, {
      title: def.title,
      description: def.description,
      category: def.category,
      fileType: def.fileType,
      fileUrl: def.fileUrl,
      fileKey: null,
      accessTier: def.accessTier,
      isPublished: true,
      associatedLessonSlug: def.associatedLessonSlug,
    });
    if (!updated.ok) {
      console.error(`  [ERROR] Failed to build update for "${def.id}":`, updated.error);
      return false;
    }
    const result = await repo.update(updated.value);
    if (!result.ok) {
      console.error(`  [ERROR] Failed to update "${def.id}":`, result.error);
      return false;
    }
    console.log(`  [UPDATE] "${def.id}" → ${def.title}`);
    return true;
  }

  const created = createResource({
    id: def.id,
    title: def.title,
    description: def.description,
    category: def.category,
    fileType: def.fileType,
    fileUrl: def.fileUrl,
    fileKey: null,
    accessTier: def.accessTier,
    associatedLessonSlug: def.associatedLessonSlug,
    createdById: "system:learn-050",
  });
  if (!created.ok) {
    console.error(`  [ERROR] Failed to build "${def.id}":`, created.error);
    return false;
  }
  const result = await repo.create(created.value);
  if (!result.ok) {
    console.error(`  [ERROR] Failed to create "${def.id}":`, result.error);
    return false;
  }
  console.log(`  [CREATE] "${def.id}" → ${def.title}`);
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const dryRun = values["dry-run"] === true;

  console.log("\nAMPH LEARN-050 Job-Ready Resource Pack Seed");
  console.log("─".repeat(40));
  console.log(`  Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`  Resources: ${RESOURCES.length}`);
  console.log("─".repeat(40) + "\n");

  if (dryRun) {
    for (const def of RESOURCES) {
      const anchor = def.associatedLessonSlug ?? "(cross-cutting)";
      console.log(
        `  [DRY]   "${def.id}" (${def.category}/${def.accessTier}, lesson=${anchor}) → ${def.title}`,
      );
    }
    console.log("\n[OK] Dry run complete.\n");
    return;
  }

  const repo = new PrismaResourceRepository(prisma);
  let failures = 0;
  for (const def of RESOURCES) {
    if (!(await upsertResource(def, repo))) failures += 1;
  }

  if (failures > 0) {
    throw new Error(`${failures} of ${RESOURCES.length} resources failed to seed.`);
  }

  console.log("\n[OK] Done. LEARN-050 job-ready resource pack is ready.\n");
}

main()
  .catch((err) => {
    console.error("\n[FAIL] Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());