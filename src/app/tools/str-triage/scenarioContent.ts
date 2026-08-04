/**
 * scenarioContent.ts — parses a str-triage SimulatorScenario's inputSchema
 * into a typed StrTriageInput (minus userClassifications).
 *
 * STORY-085. Not a "use server" file (unlike actions.ts) so it can export
 * a plain schema/type used by both the server component (page.tsx) and
 * the server actions (actions.ts).
 */

import { z } from "zod";
import type {
  StrTriageInput,
  MatchType,
  CampaignRole,
  TargetState,
} from "@/domain/simulator/str-triage/StrTriageInput";

const MATCH_TYPES: readonly MatchType[] = ["exact", "phrase", "broad"];
const CAMPAIGN_ROLES: readonly CampaignRole[] = ["research", "performance", "defense"];
const TARGET_STATES: readonly TargetState[] = ["enabled", "paused", "archived"];

const searchTermRowSchema = z.object({
  searchTerm: z.string().min(1),
  impressions: z.number().nonnegative(),
  clicks: z.number().nonnegative(),
  spend: z.number().nonnegative(),
  orders: z.number().nonnegative(),
  sales: z.number().nonnegative(),
  elapsedDays: z.number().nonnegative(),
  sourceCampaignId: z.string().min(1),
  sourceAdGroupId: z.string().min(1),
  sourceTarget: z.string().min(1),
  sourceMatchType: z.enum(MATCH_TYPES as [MatchType, ...MatchType[]]),
});

const existingTargetSchema = z.object({
  text: z.string().min(1),
  normalizedText: z.string().min(1),
  matchType: z.enum(MATCH_TYPES as [MatchType, ...MatchType[]]),
  campaignId: z.string().min(1),
  adGroupId: z.string().min(1),
  campaignRole: z.enum(CAMPAIGN_ROLES as [CampaignRole, ...CampaignRole[]]),
  state: z.enum(TARGET_STATES as [TargetState, ...TargetState[]]),
});

export const strTriageScenarioContentSchema = z.object({
  rows: z.array(searchTermRowSchema).min(1),
  averageOrderValue: z.number().positive(),
  expectedCtrPct: z.number().positive(),
  expectedCvrPct: z.number().positive(),
  brandTargetRoas: z.number().positive(),
  genericTargetRoas: z.number().positive(),
  competitorTargetRoas: z.number().positive(),
  confidenceLevel: z.number().min(0).max(1),
  minElapsedDays: z.number().nonnegative(),
  minOrdersForWinner: z.number().nonnegative(),
  brandLexicon: z.array(z.string()),
  competitorBrandLexicon: z.array(z.string()),
  incompatibleAttributeLexicon: z.array(z.string()).optional(),
  existingTargets: z.array(existingTargetSchema),
  sourceCampaignRole: z.enum(CAMPAIGN_ROLES as [CampaignRole, ...CampaignRole[]]),
});

export type StrTriageScenarioContent = Omit<StrTriageInput, "userClassifications">;
