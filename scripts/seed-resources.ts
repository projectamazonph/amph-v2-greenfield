/**
 * scripts/seed-resources.ts
 *
 * Seeds the pre-installed download-center resources: the original 10
 * from STORY-098 (two guides, three templates, one automation tool,
 * two cheat sheets, two handouts), plus 16 more from STORY-099 (three
 * guides, three templates, four automation tools, three cheat sheets,
 * three handouts). Idempotent: re-running upserts by a fixed id
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

  // ── STORY-099: library expansion (16 new resources) ───────────────────────

  {
    id: "res_guide_sponsored_brands_setup",
    title: "Sponsored Brands Setup Guide",
    description:
      "Ad formats, eligibility, step-by-step setup, and the mistakes that quietly waste Sponsored Brands budget.",
    category: "guide",
    fileType: "pdf",
    fileUrl: "/downloads/guides/sponsored-brands-setup-guide.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_guide_sponsored_display_setup",
    title: "Sponsored Display Setup Guide",
    description:
      "Targeting types, setup steps, and how to judge Sponsored Display performance without holding it to Sponsored Products' bar.",
    category: "guide",
    fileType: "pdf",
    fileUrl: "/downloads/guides/sponsored-display-setup-guide.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_guide_campaign_structure",
    title: "Campaign Structure & Match Type Strategy Guide",
    description:
      "The Auto → Broad → Phrase → Exact structure, and the weekly harvest loop that makes it worth building.",
    category: "guide",
    fileType: "pdf",
    fileUrl: "/downloads/guides/campaign-structure-match-type-strategy-guide.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_template_negative_keyword_list",
    title: "Negative Keyword Master List Template",
    description:
      "One central log of every negative keyword you've added across campaigns, with match type, level, and reason, so you never re-discover the same bleeder twice.",
    category: "template",
    fileType: "xlsx",
    fileUrl: "/downloads/templates/negative-keyword-master-list-template.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_template_client_onboarding",
    title: "New Client Onboarding Checklist Template",
    description:
      "A five-phase checklist (access, audit, goals, campaign cleanup, first report) for taking over a new Amazon Ads account.",
    category: "template",
    fileType: "xlsx",
    fileUrl: "/downloads/templates/new-client-onboarding-checklist-template.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_template_budget_pacing_tracker",
    title: "Budget Pacing Tracker Template",
    description:
      "A daily log of planned budget vs. actual spend per campaign, with running month totals and average daily spend.",
    category: "template",
    fileType: "xlsx",
    fileUrl: "/downloads/templates/budget-pacing-tracker-template.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_automation_placement_bid_calculator",
    title: "Placement Bid Modifier Calculator",
    description:
      "Paste in Placement report data and it recommends a bid modifier per placement against your target ACOS, flagging rows without enough orders to trust.",
    category: "automation_tool",
    fileType: "xlsx",
    fileUrl: "/downloads/automation-tools/placement-bid-modifier-calculator.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_automation_keyword_bid_calculator",
    title: "Keyword Bid Calculator",
    description:
      "Suggests a starting max CPC for new or low-data keywords from target ACOS, estimated conversion rate, and average order value.",
    category: "automation_tool",
    fileType: "xlsx",
    fileUrl: "/downloads/automation-tools/keyword-bid-calculator.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_automation_budget_pacing_dayparting",
    title: "Budget Pacing & Dayparting Analyzer",
    description:
      "Flags campaigns overpacing or underpacing their daily budget, and hour-of-day spend that's a candidate for dayparting off.",
    category: "automation_tool",
    fileType: "xlsx",
    fileUrl: "/downloads/automation-tools/budget-pacing-dayparting-analyzer.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_automation_campaign_health_scorecard",
    title: "Campaign Health Scorecard",
    description:
      "Scores every campaign 0-100 from ACOS, CTR, and CVR against your targets, and buckets each as Healthy, Watch, or At risk for fast portfolio triage.",
    category: "automation_tool",
    fileType: "xlsx",
    fileUrl: "/downloads/automation-tools/campaign-health-scorecard.xlsx",
    accessTier: "STARTER",
  },
  {
    id: "res_cheatsheet_acronyms_glossary",
    title: "Amazon PPC Acronyms & Glossary Cheat Sheet",
    description:
      "The terms you'll hit in your first month, in one place: metrics, ad formats, structure, and catalog vocabulary.",
    category: "cheat_sheet",
    fileType: "pdf",
    fileUrl: "/downloads/cheat-sheets/amazon-ppc-acronyms-glossary-cheat-sheet.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_cheatsheet_sp_sb_sd_comparison",
    title: "SP vs SB vs SD Comparison Cheat Sheet",
    description:
      "Sponsored Products, Sponsored Brands, and Sponsored Display side by side, and when each one earns its place in the budget.",
    category: "cheat_sheet",
    fileType: "pdf",
    fileUrl: "/downloads/cheat-sheets/sp-sb-sd-comparison-cheat-sheet.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_cheatsheet_negative_match_type",
    title: "Negative Keyword Match Type Cheat Sheet",
    description:
      "Exact vs. Phrase vs. Product negatives, and the one mistake (applying at the wrong level) that quietly undoes them all.",
    category: "cheat_sheet",
    fileType: "pdf",
    fileUrl: "/downloads/cheat-sheets/negative-keyword-match-type-cheat-sheet.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_handout_va_weekly_checklist",
    title: "VA Weekly Task Checklist",
    description:
      "The recurring weekly and monthly tasks that keep an Amazon Ads account healthy between full audits.",
    category: "handout",
    fileType: "pdf",
    fileUrl: "/downloads/handouts/va-weekly-task-checklist-handout.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_handout_troubleshooting_ppc",
    title: "Troubleshooting Common PPC Issues",
    description:
      "A first-pass diagnosis table for the symptoms you'll see most often (ACOS spikes, dead impressions, missing orders) and the order to check things in.",
    category: "handout",
    fileType: "pdf",
    fileUrl: "/downloads/handouts/troubleshooting-common-ppc-issues-handout.pdf",
    accessTier: "PREVIEW",
  },
  {
    id: "res_handout_client_etiquette",
    title: "Client Communication Etiquette",
    description:
      "Response-time expectations, tone guidelines, and how to deliver bad news and escalate decisions without eroding client trust.",
    category: "handout",
    fileType: "docx",
    fileUrl: "/downloads/handouts/client-communication-etiquette-handout.docx",
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
