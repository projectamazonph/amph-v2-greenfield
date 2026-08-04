/**
 * scripts/seed-simulator-scenarios.ts
 *
 * Seeds the SimulatorScenario rows that every simulator's full attempt-
 * lifecycle action (StartSimulatorAttempt) requires to exist before it will
 * grade a submission. No seed script ever created these rows, so on a
 * fresh database str-triage's "Grade my triage" (which has no legacy
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
    description: "Wireless earbuds campaign spending ₱800/day at 45% ACoS; target is 25%.",
    difficulty: "intermediate",
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
    description: "Triage 14 search terms from a broad-match kitchen products campaign.",
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
    description: "Build a complete SP campaign with manual targeting and a ₱500/day budget.",
    difficulty: "beginner",
    estimatedMinutes: 15,
    // Losslessly migrated from src/app/tools/campaign-builder/page.tsx's SCENARIO const.
    // This is genuinely all that exists — ground truth is procedurally generated
    // from hardcoded engine constants (STORY-084 is the real ground-truth story).
    inputSchema: {
      productCategory: "Electronics",
      productNiche: "wireless earbuds",
      monthlyBudget: 15000,
    },
  },
  {
    id: "listing-audit-scenario-bamboo-cutting-board",
    simulatorId: "listing-audit",
    name: "Bamboo Cutting Board — Premium Kitchen Essential",
    description: "Audit and revise a bamboo cutting board listing.",
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
    description: "Classify intent and flag negatives across 18 keywords in the niche.",
    difficulty: "beginner",
    estimatedMinutes: 10,
    // STORY-081's KeywordDataset system already owns real keyword content —
    // this scenario intentionally does not duplicate it. "Publishing a new
    // version" here means changing which niche is pre-filled by default.
    inputSchema: {
      defaultNicheId: "bamboo-cutting-board",
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
