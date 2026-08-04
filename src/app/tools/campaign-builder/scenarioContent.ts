/**
 * scenarioContent.ts — parses a campaign-builder SimulatorScenario's
 * inputSchema into typed content.
 *
 * STORY-085. Not a "use server" file (unlike actions.ts) so it can export
 * a plain schema/type used by both the server component (page.tsx) and
 * the server actions (actions.ts).
 *
 * STORY-084: ground truth is still procedurally generated from hardcoded
 * engine constants in CampaignBuilderSimulator (60/25/15 split,
 * BASE_CPC=0.4), but now takes scenario-supplied brand taxonomy, an ASIN,
 * and budget-reconciliation parameters — see docs/stories/STORY-084.md.
 */

import { z } from "zod";

export const campaignBuilderScenarioContentSchema = z.object({
  productCategory: z.string().min(1),
  productNiche: z.string().min(1),
  monthlyBudget: z.number().positive(),
  // ── STORY-084: brand taxonomy (negative routing + branded isolation) ────
  brandName: z.string().optional(),
  brandAliases: z.array(z.string()).default([]),
  brandMisspellings: z.array(z.string()).default([]),
  brandProductNames: z.array(z.string()).default([]),
  competitorBrands: z.array(z.string()).default([]),
  // ── STORY-084: naming convention ─────────────────────────────────────────
  asin: z.string().optional(),
  // ── STORY-084: budget reconciliation ─────────────────────────────────────
  planningPeriodDays: z.number().positive().default(30),
  accountDailyBudgetCap: z.number().positive().optional(),
});

export type CampaignBuilderScenarioContent = z.infer<typeof campaignBuilderScenarioContentSchema>;
