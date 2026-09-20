/**
 * scripts/seed-simulator-scenarios.ts
 *
 * Seeds the SimulatorScenario rows that every simulator's full attempt-
 * lifecycle action (StartSimulatorAttempt) requires to exist before it will
 * grade a submission. No seed script ever created these rows, so on a
 * fresh database str-triage's "Check my decisions" (which has no legacy
 * ungated fallback, unlike the other four simulators) fails outright with
 * a scenario_not_found error surfaced straight to the student. The other
 * four simulators' *Attempt() actions reference the same missing IDs and
 * would fail identically once wired to their pages. Idempotent: re-running
 * safely upserts existing scenarios.
 *
 * STORY-085: each scenario now carries real `inputSchema` content —
 * losslessly migrated from the hardcoded `SCENARIO` const each simulator's
 * page.tsx used to own — and seeds as `status: "published", version: 1`.
 * This is what makes the per-simulator server-side rewire (fetching
 * published scenario content instead of trusting hardcoded/client-echoed
 * data) actually load real content instead of an empty {}.
 *
 * Usage:
 *   pnpm db:seed:scenarios
 *
 * Requires DATABASE_URL in .env.local or .env. Run after
 * `pnpm prisma migrate deploy`.
 */

import { existsSync, readFileSync } from "node:fs";
import { prisma } from "@/infra/database/prisma";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";

// ── .env loader ──────────────────────────────────────────────────────────

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

// ── Scenarios ────────────────────────────────────────────────────────────
// IDs must match the DEFAULT_SCENARIO_ID / hardcoded scenarioId in each
// simulator's src/app/tools/<name>/actions.ts.

const SCENARIOS: ReadonlyArray<{
  id: string;
  simulatorId: string;
  name: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  inputSchema: Record<string, unknown>;
}> = [
  {
    id: "bid-elevator-scenario-default",
    simulatorId: "bid-elevator",
    name: "Reduce ACoS on a high-spend electronics campaign",
    description:
      "Review a wireless earbuds campaign spending ₱800/day at 45% ACoS. Set bids against a 25% target.",
    difficulty: "beginner",
    estimatedMinutes: 10,
    // Losslessly migrated from src/app/tools/bid-elevator/page.tsx's SCENARIO const.
    inputSchema: {
      currencyCode: "USD",
      dailyBudget: 1000,
      simulationDays: 1,
      targetRoas: 4.0,
      breakEvenAcosPct: 45,
      defaultRevenuePerOrder: 35,
      minimumBidIncrement: 0.05,
      keywords: [
        {
          keywordId: "wireless-earbuds",
          keyword: "wireless earbuds",
          matchType: "exact",
          intent: "generic",
          strategicRole: "performance",
          currentBid: 25,
          baselineBid: 25,
          baselineCtrPct: 2.6,
          baselineCvrPct: 11,
          benchmarkCpc: 0.85,
          availableImpressionsPerDay: 415,
          maxImpressionSharePct: 40,
          bidElasticity: 1.5,
          evidenceClicks: 62,
          evidenceOrders: 7,
          evidenceWindowDays: 30,
        },
        {
          keywordId: "bluetooth-earbuds",
          keyword: "bluetooth earbuds",
          matchType: "exact",
          intent: "generic",
          strategicRole: "performance",
          currentBid: 30,
          baselineBid: 30,
          baselineCtrPct: 2.2,
          baselineCvrPct: 9,
          benchmarkCpc: 1.1,
          availableImpressionsPerDay: 273,
          maxImpressionSharePct: 38,
          bidElasticity: 1.4,
          evidenceClicks: 48,
          evidenceOrders: 4,
          evidenceWindowDays: 30,
        },
        {
          keywordId: "wireless-headphones",
          keyword: "wireless headphones",
          matchType: "broad",
          intent: "category",
          strategicRole: "research",
          currentBid: 15,
          baselineBid: 15,
          baselineCtrPct: 1.6,
          baselineCvrPct: 6,
          benchmarkCpc: 0.6,
          availableImpressionsPerDay: 737,
          maxImpressionSharePct: 30,
          bidElasticity: 1.2,
          evidenceClicks: 35,
          evidenceOrders: 2,
          evidenceWindowDays: 30,
        },
        {
          keywordId: "earbuds-for-iphone",
          keyword: "earbuds for iphone",
          matchType: "phrase",
          intent: "category",
          strategicRole: "research",
          currentBid: 20,
          baselineBid: 20,
          baselineCtrPct: 2.4,
          baselineCvrPct: 10,
          benchmarkCpc: 0.75,
          availableImpressionsPerDay: 187,
          maxImpressionSharePct: 40,
          bidElasticity: 1.6,
          evidenceClicks: 33,
          evidenceOrders: 4,
          evidenceWindowDays: 30,
        },
        {
          keywordId: "cheap-earbuds",
          keyword: "cheap earbuds",
          matchType: "broad",
          intent: "category",
          strategicRole: "research",
          currentBid: 18,
          baselineBid: 18,
          baselineCtrPct: 1.8,
          baselineCvrPct: 5,
          benchmarkCpc: 0.5,
          availableImpressionsPerDay: 510,
          maxImpressionSharePct: 32,
          bidElasticity: 1.1,
          evidenceClicks: 41,
          evidenceOrders: 2,
          evidenceWindowDays: 30,
        },
        {
          keywordId: "running-earbuds",
          keyword: "running earbuds",
          matchType: "phrase",
          intent: "category",
          strategicRole: "research",
          currentBid: 22,
          baselineBid: 22,
          baselineCtrPct: 2.9,
          baselineCvrPct: 12,
          benchmarkCpc: 0.95,
          availableImpressionsPerDay: 137,
          maxImpressionSharePct: 42,
          bidElasticity: 1.7,
          evidenceClicks: 29,
          evidenceOrders: 3,
          evidenceWindowDays: 30,
        },
        {
          keywordId: "noise-cancelling-earbuds",
          keyword: "noise cancelling earbuds",
          matchType: "exact",
          intent: "generic",
          strategicRole: "performance",
          currentBid: 28,
          baselineBid: 28,
          baselineCtrPct: 2.7,
          baselineCvrPct: 13,
          benchmarkCpc: 1.2,
          availableImpressionsPerDay: 227,
          maxImpressionSharePct: 40,
          bidElasticity: 1.5,
          evidenceClicks: 55,
          evidenceOrders: 8,
          evidenceWindowDays: 30,
        },
        {
          keywordId: "earbuds-with-mic",
          keyword: "earbuds with mic",
          matchType: "phrase",
          intent: "category",
          strategicRole: "research",
          currentBid: 16,
          baselineBid: 16,
          baselineCtrPct: 2.0,
          baselineCvrPct: 8,
          benchmarkCpc: 0.65,
          availableImpressionsPerDay: 313,
          maxImpressionSharePct: 35,
          bidElasticity: 1.3,
          evidenceClicks: 26,
          evidenceOrders: 2,
          evidenceWindowDays: 30,
        },
      ],
    },
  },
  {
    id: "str-triage-scenario-kitchen-products",
    simulatorId: "str-triage",
    name: "Clean up a broad match campaign for kitchen products",
    description:
      "Review 14 search terms from a broad-match kitchen products campaign. Choose the action for each term.",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    // Losslessly migrated from src/app/tools/str-triage/page.tsx's SCENARIO const.
    inputSchema: {
      averageOrderValue: 30,
      expectedCtrPct: 4,
      expectedCvrPct: 5,
      brandTargetRoas: 5,
      genericTargetRoas: 3,
      competitorTargetRoas: 4,
      confidenceLevel: 0.8,
      minElapsedDays: 7,
      minOrdersForWinner: 2,
      brandLexicon: ["homechef"],
      competitorBrandLexicon: ["cutco"],
      incompatibleAttributeLexicon: ["left handed"],
      sourceCampaignRole: "research",
      existingTargets: [
        {
          text: "stainless steel knife set",
          normalizedText: "stainless steel knife set",
          matchType: "exact",
          campaignId: "camp-performance-kitchen-1",
          adGroupId: "ag-performance-1",
          campaignRole: "performance",
          state: "enabled",
        },
        {
          text: "kitchen knife",
          normalizedText: "kitchen knife",
          matchType: "broad",
          campaignId: "camp-research-kitchen-1",
          adGroupId: "ag-broad-kitchen",
          campaignRole: "research",
          state: "enabled",
        },
      ],
      rows: [
        {
          searchTerm: "stainless steel knife set",
          impressions: 6000,
          clicks: 300,
          spend: 120,
          orders: 8,
          sales: 480,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "kitchen knife",
          impressions: 5000,
          clicks: 250,
          spend: 95,
          orders: 5,
          sales: 285,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "cutting board oil",
          impressions: 900,
          clicks: 45,
          spend: 60,
          orders: 0,
          sales: 0,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "cheap knives",
          impressions: 900,
          clicks: 45,
          spend: 30,
          orders: 0,
          sales: 0,
          elapsedDays: 3,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "wooden cutting board",
          impressions: 1200,
          clicks: 60,
          spend: 30,
          orders: 2,
          sales: 90,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "homechef knife set",
          impressions: 1200,
          clicks: 60,
          spend: 30,
          orders: 3,
          sales: 150,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "cutco knife sharpener",
          impressions: 1000,
          clicks: 50,
          spend: 20,
          orders: 2,
          sales: 80,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "cutco replacement blade",
          impressions: 1000,
          clicks: 50,
          spend: 25,
          orders: 3,
          sales: 150,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "kitchen shears",
          impressions: 900,
          clicks: 45,
          spend: 20,
          orders: 2,
          sales: 40,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "plastic spoon rest",
          impressions: 900,
          clicks: 45,
          spend: 20,
          orders: 0,
          sales: 0,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "plastic ladle holder",
          impressions: 900,
          clicks: 45,
          spend: 20,
          orders: 0,
          sales: 0,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "plastic trivet mat",
          impressions: 900,
          clicks: 45,
          spend: 20,
          orders: 0,
          sales: 0,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "utensil drying rack",
          impressions: 900,
          clicks: 45,
          spend: 20,
          orders: 0,
          sales: 0,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "left handed knife set",
          impressions: 900,
          clicks: 45,
          spend: 20,
          orders: 0,
          sales: 0,
          elapsedDays: 14,
          sourceCampaignId: "camp-research-kitchen-1",
          sourceAdGroupId: "ag-broad-kitchen",
          sourceTarget: "kitchen knives",
          sourceMatchType: "broad",
        },
      ],
    },
  },
  {
    id: "campaign-builder-scenario-default",
    simulatorId: "campaign-builder",
    name: "Launch a Sponsored Products campaign for wireless earbuds",
    description:
      "Build a Sponsored Products structure for wireless earbuds with a ₱500/day budget.",
    difficulty: "beginner",
    estimatedMinutes: 15,
    // Losslessly migrated from src/app/tools/campaign-builder/page.tsx's SCENARIO const.
    // Ground truth is still procedurally generated from hardcoded engine
    // constants; STORY-084 added the brand-taxonomy/ASIN/budget-
    // reconciliation fields below so the 4 new grading dimensions have
    // scenario context (agent-authored scenario content, not requiring
    // Ryan's per-scenario authoring — same reasoning as STORY-083's seed
    // update).
    inputSchema: {
      productCategory: "Electronics",
      productNiche: "wireless earbuds",
      monthlyBudget: 15000,
      brandName: "Sonora",
      brandAliases: ["Sonora Audio"],
      brandMisspellings: ["Sonara", "Sonorra"],
      brandProductNames: ["Sonora Pulse", "Sonora Pulse Pro"],
      competitorBrands: ["Beats", "Bose", "Sony"],
      asin: "B0EXAMPLE1",
      planningPeriodDays: 30,
      accountDailyBudgetCap: 1000,
    },
  },
  {
    id: "listing-audit-scenario-bamboo-cutting-board",
    simulatorId: "listing-audit",
    name: "Bamboo Cutting Board — Premium Kitchen Essential",
    description:
      "Review and revise a bamboo cutting board listing. Prioritize the fixes that matter most.",
    difficulty: "beginner",
    estimatedMinutes: 10,
    // Losslessly migrated from src/app/tools/listing-audit/page.tsx's SCENARIO const.
    // `images`/`hasVideo`/`hasAPlus`/`marketplace` were implicit defaults on the
    // page before — made explicit here. `name` above doubles as the initial
    // listing title (the page's SCENARIO.title served both roles already).
    // STORY-083: structuredAttributes/primaryCustomerIntent/primaryKeywords/
    // complianceEvidence are new ground-truth resolver context — reasonable,
    // documented scenario content, not requiring Ryan's per-scenario
    // authoring (only the engine *rules* needed his judgment).
    inputSchema: {
      category: "Kitchen",
      niche: "bamboo cutting board",
      bullets: [
        "100% organic bamboo, sustainable and food-safe",
        "Knife-friendly surface that won't dull your blades",
        "Easy to clean — hand wash with soap and water",
      ],
      description:
        "High-quality bamboo cutting board for home cooks and professional chefs. Durable, knife-friendly, and naturally beautiful.",
      images: [],
      hasVideo: false,
      hasAPlus: false,
      marketplace: "US",
      structuredAttributes: {
        material: "100% organic bamboo",
        dimensions: "18 x 12 x 1 in",
      },
      primaryCustomerIntent: "home cooks looking for a durable, sustainable kitchen cutting board",
      primaryKeywords: ["bamboo cutting board", "kitchen cutting board"],
      complianceEvidence: {},
    },
  },
  {
    id: "keyword-research-scenario-default",
    simulatorId: "keyword-research",
    name: "Keyword research for bamboo cutting board niche",
    description: "Classify 18 bamboo cutting board keywords and flag the terms that do not belong.",
    difficulty: "beginner",
    estimatedMinutes: 10,
    // STORY-081's KeywordDataset system already owns real keyword content —
    // this scenario intentionally does not duplicate it. "Publishing a new
    // version" here means changing which niche is pre-filled by default.
    inputSchema: {
      defaultNicheId: "bamboo-cutting-board",
    },
  },
  {
    id: "bid-elevator-scenario-independent",
    simulatorId: "bid-elevator",
    name: "Optimize bids for a seasonal electronics campaign during Prime Day",
    description:
      "Manage bids for a consumer electronics campaign during Prime Day with 3x traffic and 2x conversion rate. Adjust bids across 3 keywords with varying elasticity. Unassisted: read the evidence window first.",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    inputSchema: {
      currencyCode: "USD",
      dailyBudget: 5000,
      simulationDays: 2,
      targetRoas: 5.0,
      breakEvenAcosPct: 22,
      defaultRevenuePerOrder: 85,
      minimumBidIncrement: 0.1,
      keywords: [
        {
          keywordId: "noise-cancelling-headphones",
          keyword: "noise cancelling headphones",
          matchType: "exact",
          intent: "generic",
          strategicRole: "performance",
          currentBid: 45,
          baselineBid: 45,
          baselineCtrPct: 3.2,
          baselineCvrPct: 14,
          benchmarkCpc: 1.85,
          availableImpressionsPerDay: 2100,
          maxImpressionSharePct: 50,
          bidElasticity: 1.3,
          evidenceClicks: 180,
          evidenceOrders: 45,
          evidenceWindowDays: 7,
        },
        {
          keywordId: "wireless-earbuds-pro",
          keyword: "wireless earbuds pro",
          matchType: "phrase",
          intent: "generic",
          strategicRole: "performance",
          currentBid: 38,
          baselineBid: 38,
          baselineCtrPct: 2.8,
          baselineCvrPct: 12,
          benchmarkCpc: 1.45,
          availableImpressionsPerDay: 1800,
          maxImpressionSharePct: 45,
          bidElasticity: 1.2,
          evidenceClicks: 140,
          evidenceOrders: 38,
          evidenceWindowDays: 7,
        },
        {
          keywordId: "true-wireless-earbuds",
          keyword: "true wireless earbuds",
          matchType: "broad",
          intent: "category",
          strategicRole: "research",
          currentBid: 28,
          baselineBid: 28,
          baselineCtrPct: 1.8,
          baselineCvrPct: 8,
          benchmarkCpc: 0.95,
          availableImpressionsPerDay: 3200,
          maxImpressionSharePct: 30,
          bidElasticity: 1.1,
          evidenceClicks: 90,
          evidenceOrders: 18,
          evidenceWindowDays: 7,
        },
      ],
    },
  },
  {
    id: "bid-elevator-scenario-messy",
    simulatorId: "bid-elevator",
    name: "Messy client brief: inconsistent bid data for home office equipment",
    description:
      "Client spreadsheet lists home-office keywords with duplicate rows, a missing bid, and mixed intents. Clean the list first: drop the duplicate, fill or flag the gap, then set bids.",
    difficulty: "advanced",
    estimatedMinutes: 20,
    inputSchema: {
      currencyCode: "USD",
      dailyBudget: 800,
      simulationDays: 1,
      targetRoas: 3.5,
      breakEvenAcosPct: 30,
      defaultRevenuePerOrder: 42,
      minimumBidIncrement: 0.05,
      keywords: [
        {
          keywordId: "standing-desk",
          keyword: "standing desk",
          matchType: "broad",
          intent: "category",
          strategicRole: "research",
          currentBid: 12.5,
          baselineBid: 12.5,
          baselineCtrPct: 2.1,
          baselineCvrPct: 7,
          benchmarkCpc: 0.95,
          availableImpressionsPerDay: 900,
          maxImpressionSharePct: 35,
          bidElasticity: 1.2,
          evidenceClicks: 55,
          evidenceOrders: 4,
          evidenceWindowDays: 14,
        },
        {
          keywordId: "ergonomic-chair",
          keyword: "ergonomic chair",
          matchType: "phrase",
          intent: "category",
          strategicRole: "performance",
          currentBid: 22,
          baselineBid: 22,
          baselineCtrPct: 2.9,
          baselineCvrPct: 11,
          benchmarkCpc: 1.6,
          availableImpressionsPerDay: 640,
          maxImpressionSharePct: 40,
          bidElasticity: 1.4,
          evidenceClicks: 71,
          evidenceOrders: 8,
          evidenceWindowDays: 14,
        },
        {
          keywordId: "monitor-arm",
          keyword: "monitor arm",
          matchType: "exact",
          intent: "generic",
          strategicRole: "performance",
          currentBid: 18.5,
          baselineBid: 18.5,
          baselineCtrPct: 3.1,
          baselineCvrPct: 13,
          benchmarkCpc: 1.2,
          availableImpressionsPerDay: 410,
          maxImpressionSharePct: 45,
          bidElasticity: 1.5,
          evidenceClicks: 63,
          evidenceOrders: 9,
          evidenceWindowDays: 14,
        },
      ],
    },
  },
  {
    id: "str-triage-scenario-beginner",
    simulatorId: "str-triage",
    name: "Clean up a broad match campaign for beauty products",
    description:
      "Review 10 search terms from a broad-match beauty campaign. Clear winners, clear losers, and two watch-and-wait rows. Decide keep, harvest, lower bid, negate, or watch for each.",
    difficulty: "beginner",
    estimatedMinutes: 10,
    inputSchema: {
      averageOrderValue: 25,
      expectedCtrPct: 3.5,
      expectedCvrPct: 4,
      brandTargetRoas: 4,
      genericTargetRoas: 2.5,
      competitorTargetRoas: 3.5,
      confidenceLevel: 0.85,
      minElapsedDays: 10,
      minOrdersForWinner: 3,
      brandLexicon: ["glowskin"],
      competitorBrandLexicon: ["beautypro"],
      incompatibleAttributeLexicon: ["men's"],
      sourceCampaignRole: "research",
      existingTargets: [
        {
          text: "vitamin c serum",
          normalizedText: "vitamin c serum",
          matchType: "exact",
          campaignId: "camp-beauty-glow-1",
          adGroupId: "ag-performance-1",
          campaignRole: "performance",
          state: "enabled",
        },
        {
          text: "face serum",
          normalizedText: "face serum",
          matchType: "broad",
          campaignId: "camp-beauty-research-1",
          adGroupId: "ag-broad-beauty",
          campaignRole: "research",
          state: "enabled",
        },
      ],
      rows: [
        {
          searchTerm: "vitamin c serum for face",
          impressions: 4500,
          clicks: 180,
          spend: 75,
          orders: 5,
          sales: 180,
          elapsedDays: 10,
          sourceCampaignId: "camp-beauty-research-1",
          sourceAdGroupId: "ag-broad-beauty",
          sourceTarget: "face serum",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "hyaluronic acid serum",
          impressions: 3800,
          clicks: 150,
          spend: 65,
          orders: 3,
          sales: 120,
          elapsedDays: 14,
          sourceCampaignId: "camp-beauty-research-1",
          sourceAdGroupId: "ag-broad-beauty",
          sourceTarget: "face serum",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "cheap face serum",
          impressions: 2200,
          clicks: 120,
          spend: 45,
          orders: 0,
          sales: 0,
          elapsedDays: 10,
          sourceCampaignId: "camp-beauty-research-1",
          sourceAdGroupId: "ag-broad-beauty",
          sourceTarget: "face serum",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "best vitamin c serum 2024",
          impressions: 1500,
          clicks: 60,
          spend: 30,
          orders: 2,
          sales: 80,
          elapsedDays: 7,
          sourceCampaignId: "camp-beauty-research-1",
          sourceAdGroupId: "ag-broad-beauty",
          sourceTarget: "face serum",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "vitamin e serum",
          impressions: 1800,
          clicks: 70,
          spend: 25,
          orders: 0,
          sales: 0,
          elapsedDays: 10,
          sourceCampaignId: "camp-beauty-research-1",
          sourceAdGroupId: "ag-broad-beauty",
          sourceTarget: "face serum",
          sourceMatchType: "broad",
        },
      ],
    },
  },
  {
    id: "str-triage-scenario-messy",
    simulatorId: "str-triage",
    name: "Messy client brief: duplicate search terms for pet supplements",
    description:
      "Client export lists pet-supplement search terms with the same term twice under different match types plus two irrelevant rows. Dedupe first, then triage every row.",
    difficulty: "advanced",
    estimatedMinutes: 20,
    inputSchema: {
      averageOrderValue: 32,
      expectedCtrPct: 4,
      expectedCvrPct: 5,
      brandTargetRoas: 5,
      genericTargetRoas: 3,
      competitorTargetRoas: 4,
      confidenceLevel: 0.8,
      minElapsedDays: 7,
      minOrdersForWinner: 2,
      brandLexicon: ["pawvital"],
      competitorBrandLexicon: ["petnc"],
      incompatibleAttributeLexicon: ["human"],
      sourceCampaignRole: "research",
      existingTargets: [
        {
          text: "dog joint supplement",
          normalizedText: "dog joint supplement",
          matchType: "broad",
          campaignId: "camp-pet-research-1",
          adGroupId: "ag-broad-pet",
          campaignRole: "research",
          state: "enabled",
        },
      ],
      rows: [
        {
          searchTerm: "dog joint supplement",
          impressions: 5200,
          clicks: 260,
          spend: 110,
          orders: 7,
          sales: 420,
          elapsedDays: 14,
          sourceCampaignId: "camp-pet-research-1",
          sourceAdGroupId: "ag-broad-pet",
          sourceTarget: "dog joint supplement",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "dog joint supplement",
          impressions: 3100,
          clicks: 150,
          spend: 68,
          orders: 4,
          sales: 240,
          elapsedDays: 14,
          sourceCampaignId: "camp-pet-research-1",
          sourceAdGroupId: "ag-broad-pet",
          sourceTarget: "dog joint supplement",
          sourceMatchType: "phrase",
        },
        {
          searchTerm: "glucosamine for dogs",
          impressions: 4400,
          clicks: 200,
          spend: 88,
          orders: 6,
          sales: 360,
          elapsedDays: 14,
          sourceCampaignId: "camp-pet-research-1",
          sourceAdGroupId: "ag-broad-pet",
          sourceTarget: "dog joint supplement",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "human glucosamine",
          impressions: 1200,
          clicks: 60,
          spend: 28,
          orders: 0,
          sales: 0,
          elapsedDays: 14,
          sourceCampaignId: "camp-pet-research-1",
          sourceAdGroupId: "ag-broad-pet",
          sourceTarget: "dog joint supplement",
          sourceMatchType: "broad",
        },
        {
          searchTerm: "dog treats",
          impressions: 2000,
          clicks: 90,
          spend: 30,
          orders: 0,
          sales: 0,
          elapsedDays: 14,
          sourceCampaignId: "camp-pet-research-1",
          sourceAdGroupId: "ag-broad-pet",
          sourceTarget: "dog joint supplement",
          sourceMatchType: "broad",
        },
      ],
    },
  },
  {
    id: "campaign-builder-scenario-independent",
    simulatorId: "campaign-builder",
    name: "Build a Sponsored Brands campaign for a premium coffee brand",
    description:
      "Design a Sponsored Brands structure for a premium coffee brand with headline search and product collection targeting. Unassisted: name campaigns so another VA can read them.",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    inputSchema: {
      productCategory: "Grocery",
      productNiche: "premium coffee",
      monthlyBudget: 12000,
      brandName: "AromaPeak",
      brandAliases: ["AromaPeak Coffee"],
      brandMisspellings: ["Aromapeak", "Aroma Peak"],
      brandProductNames: ["AromaPeak Reserve", "AromaPeak Decaf"],
      competitorBrands: ["Lavazza", "Illy"],
      asin: "B0EXAMPLE2",
      planningPeriodDays: 30,
      accountDailyBudgetCap: 500,
    },
  },
  {
    id: "campaign-builder-scenario-messy",
    simulatorId: "campaign-builder",
    name: "Messy client brief: incomplete brief for a fitness equipment launch",
    description:
      "Client wants a resistance-bands launch but the brief is missing the ASIN, the budget cap, and brand assets. Build the viable core structure and flag every gap the client must close.",
    difficulty: "advanced",
    estimatedMinutes: 25,
    inputSchema: {
      productCategory: "Sports",
      productNiche: "resistance bands",
      monthlyBudget: 9000,
      brandName: "FlexFit",
      brandAliases: [],
      brandMisspellings: [],
      brandProductNames: [],
      competitorBrands: [],
      planningPeriodDays: 30,
    },
  },
  {
    id: "listing-audit-scenario-independent",
    simulatorId: "listing-audit",
    name: "Audit a stainless steel water bottle listing for the hiking niche",
    description:
      "Evaluate a trail bottle listing for paid-traffic readiness. Unassisted: score title, images, bullets, and A+ coverage, then rank the three fixes that matter most.",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    inputSchema: {
      category: "Sports",
      niche: "insulated water bottles",
      bullets: [
        "Double-wall vacuum keeps drinks cold 24 hours",
        "18/8 stainless steel, BPA-free lid",
        "Fits standard bike cages and cup holders",
      ],
      description:
        "Trail-ready insulated bottle for hikers and commuters. Leakproof, sweatproof, and dishwasher safe.",
      images: [],
      hasVideo: false,
      hasAPlus: false,
      marketplace: "US",
      structuredAttributes: {
        material: "18/8 stainless steel",
        dimensions: "10.5 x 3 in",
      },
      primaryCustomerIntent: "hikers looking for a leakproof insulated bottle",
      primaryKeywords: ["insulated water bottle", "hiking water bottle"],
      complianceEvidence: {},
    },
  },
  {
    id: "listing-audit-scenario-messy",
    simulatorId: "listing-audit",
    name: "Messy client brief: thin pet-bed listing with missing fields",
    description:
      "Client pet-bed listing ships with one bullet, no dimensions, and no compliance evidence. Audit what exists, mark every finding you cannot verify as escalate, never guess.",
    difficulty: "advanced",
    estimatedMinutes: 20,
    inputSchema: {
      category: "Pet Supplies",
      niche: "dog beds",
      bullets: ["Soft bed for dogs"],
      description: "",
      images: [],
      hasVideo: false,
      hasAPlus: false,
      marketplace: "US",
      structuredAttributes: {},
      primaryCustomerIntent: "dog owners looking for an orthopedic bed",
      primaryKeywords: ["orthopedic dog bed"],
      complianceEvidence: {},
    },
  },
  {
    id: "keyword-research-scenario-independent",
    simulatorId: "keyword-research",
    name: "Keyword research for the vitamin C serum niche",
    description:
      "Classify the vitamin C serum keyword set and flag the terms that do not belong. Unassisted: group by intent before you harvest.",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    inputSchema: {
      defaultNicheId: "vitamin-c-serum",
    },
  },
  {
    id: "keyword-research-scenario-messy",
    simulatorId: "keyword-research",
    name: "Messy client brief: earbuds-case keywords with brand bleed",
    description:
      "Client earbuds-case list mixes competitor brand terms with generic ones. Separate the brand bleed, keep the generics, and flag the negatives.",
    difficulty: "advanced",
    estimatedMinutes: 20,
    inputSchema: {
      defaultNicheId: "wireless-earbuds-case",
    },
  },
];

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${SCENARIOS.length} SimulatorScenario records...\n`);

  const validated: SimulatorScenario[] = [];
  const invalid: string[] = [];

  for (const scenario of SCENARIOS) {
    const result = createSimulatorScenario({
      id: scenario.id,
      scenarioKey: scenario.id,
      version: 1,
      simulatorId: scenario.simulatorId,
      name: scenario.name,
      description: scenario.description,
      inputSchema: scenario.inputSchema,
      outputSchema: {},
      difficulty: scenario.difficulty,
      estimatedMinutes: scenario.estimatedMinutes,
    });

    if (!result.ok) {
      invalid.push(`  ${scenario.id}: ${JSON.stringify(result.error)}`);
    } else {
      // createSimulatorScenario() always produces status:"draft" — the seed
      // script's rows are meant to be immediately live, so override it here
      // rather than teach the factory a "seed mode".
      validated.push({ ...result.value, status: "published" });
    }
  }

  if (invalid.length > 0) {
    console.error(`\nRefusing to seed. ${invalid.length} scenario(s) are invalid:\n`);
    console.error(invalid.join("\n"));
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`All ${validated.length} scenarios passed createSimulatorScenario() validation.\n`);

  let created = 0;
  let upserted = 0;
  let failed = 0;

  for (const scenario of validated) {
    try {
      const result = await prisma.simulatorScenario.upsert({
        where: { id: scenario.id },
        update: {
          name: scenario.name,
          description: scenario.description,
          inputSchema: scenario.inputSchema,
          outputSchema: scenario.outputSchema,
          difficulty: scenario.difficulty,
          estimatedMinutes: scenario.estimatedMinutes,
          scenarioKey: scenario.scenarioKey,
          version: scenario.version,
          status: scenario.status,
        },
        create: {
          id: scenario.id,
          simulatorId: scenario.simulatorId,
          name: scenario.name,
          description: scenario.description,
          inputSchema: scenario.inputSchema,
          outputSchema: scenario.outputSchema,
          difficulty: scenario.difficulty,
          estimatedMinutes: scenario.estimatedMinutes,
          scenarioKey: scenario.scenarioKey,
          version: scenario.version,
          status: scenario.status,
        },
      });

      const action =
        result.createdAt.getTime() === result.updatedAt.getTime() ? "created" : "upserted";
      if (action === "created") created++;
      else upserted++;

      console.log(`  ${action.padEnd(8)} ${scenario.simulatorId}/${scenario.id}`);
    } catch (err) {
      console.error(`  ERROR   ${scenario.simulatorId}/${scenario.id}:`, err);
      failed++;
    }
  }

  console.log(`\nDone: ${created} created, ${upserted} upserted, ${failed} failed.`);
  await prisma.$disconnect();
  // A partial failure here must not look like success to a setup chain or
  // CI job — that's exactly how the scenario_not_found bug this script
  // fixes would go unnoticed and recur.
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
