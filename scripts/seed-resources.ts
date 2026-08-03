/**
 * scripts/seed-resources.ts
 *
 * Seeds the 10 pre-installed download-center resources (STORY-098):
 * two guides, three templates, one automation tool, two cheat sheets,
 * and two handouts. Idempotent: re-running upserts by a fixed id
 * instead of creating duplicates.
 *
 * These are static assets checked into `public/downloads/` — their
 * fileUrl is a root-relative path, not something uploaded via
 * IFileStorage, so fileKey stays null for all of them (there's
 * nothing in blob storage to clean up if one is removed).
 *
 * Usage:
 *   pnpm db:seed:resources              # seed resources
 *   pnpm db:seed:resources --dry-run    # print what would be done without writing
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
}

const RESOURCES: ResourceDef[] = [
  {
    id: "res_guide_ppc_fundamentals",
    title: "PPC Fundamentals — Quick Start Guide",
    description:
      "Amazon PPC basics for a new virtual assistant: campaign types, match types, core metrics, and a first-30-days checklist.",
    category: "guide",
    fileType: "pdf",
    fileUrl: "/downloads/guides/ppc-fundamentals-quick-start-guide.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_guide_str_reading",
    title: "Reading the Search Term Report — Quick Guide",
    description: "How to turn a raw Search Term Report into winners to scale and bleeders to cut.",
    category: "guide",
    fileType: "pdf",
    fileUrl: "/downloads/guides/search-term-report-quick-guide.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_template_client_report",
    title: "Client PPC Performance Report Template",
    description:
      "A formula-driven weekly/monthly client report: per-campaign ACOS/ROAS/CTR/CVR, totals, and a month-over-month summary section.",
    category: "template",
    fileType: "xlsx",
    fileUrl: "/downloads/templates/client-ppc-performance-report-template.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_template_weekly_monitoring",
    title: "Weekly Campaign Monitoring Sheet",
    description:
      "Log spend, budget utilization, and ACOS per campaign each week; auto-flags campaigns over target ACOS or near their budget cap.",
    category: "template",
    fileType: "xlsx",
    fileUrl: "/downloads/templates/weekly-campaign-monitoring-sheet.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_template_listing_audit",
    title: "Listing Audit Checklist Template",
    description:
      "A 25-item Amazon listing audit checklist covering title, images, bullets, backend search terms, A+ Content, reviews, and pricing.",
    category: "template",
    fileType: "xlsx",
    fileUrl: "/downloads/templates/listing-audit-checklist.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_automation_str_scanner",
    title: "STR Winner/Bleeder Scanner",
    description:
      "Paste a Search Term Report in and it automatically flags Winners, Bleeders, and Watch-list terms against adjustable ACOS/spend/click thresholds.",
    category: "automation_tool",
    fileType: "xlsx",
    fileUrl: "/downloads/automation-tools/str-winner-bleeder-scanner.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_cheatsheet_metrics",
    title: "PPC Metrics Cheat Sheet",
    description:
      "The formulas behind ACOS, TACOS, ROAS, CTR, CVR, and CPC — and what a shift in each one usually means.",
    category: "cheat_sheet",
    fileType: "pdf",
    fileUrl: "/downloads/cheat-sheets/ppc-metrics-cheat-sheet.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_cheatsheet_bid_adjustment",
    title: "Bid Adjustment Quick Reference",
    description: "Rules of thumb for keyword bids and placement modifiers, at a glance.",
    category: "cheat_sheet",
    fileType: "pdf",
    fileUrl: "/downloads/cheat-sheets/bid-adjustment-quick-reference.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_handout_va_onboarding",
    title: "New VA Onboarding — Amazon PPC Basics",
    description: "What's expected of you in your first weeks managing an Amazon PPC account.",
    category: "handout",
    fileType: "pdf",
    fileUrl: "/downloads/handouts/new-va-onboarding-handout.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_handout_email_templates",
    title: "Client Communication — Email Templates",
    description:
      "Five ready-to-adapt emails: weekly performance update, budget increase request, listing issue alert, monthly report intro, and escalation.",
    category: "handout",
    fileType: "docx",
    fileUrl: "/downloads/handouts/client-communication-email-templates.docx",
    accessTier: "PREVIEW",
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

  console.log("\nAMPH Download Center Resource Seed");
  console.log("─".repeat(40));
  console.log(`  Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`  Resources: ${RESOURCES.length}`);
  console.log("─".repeat(40) + "\n");

  if (dryRun) {
    for (const def of RESOURCES) {
      console.log(`  [DRY]   "${def.id}" (${def.category}/${def.accessTier}) → ${def.title}`);
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

  console.log("\n[OK] Done. Download center resources are ready.\n");
}

main()
  .catch((err) => {
    console.error("\n[FAIL] Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
