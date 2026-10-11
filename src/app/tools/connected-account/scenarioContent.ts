/**
 * scenarioContent.ts — parses a connected-account SimulatorScenario's
 * inputSchema into a typed scenario.
 *
 * STORY-089. Plain zod schema (no "use server") shared by the page
 * (server component) and the actions file.
 */

import { z } from "zod";

const keywordSchema = z.object({
  keywordId: z.string().min(1),
  keyword: z.string().min(1),
  matchType: z.enum(["exact", "phrase", "broad"]),
  impressions: z.number().nonnegative().int(),
  clicks: z.number().nonnegative().int(),
  spendMinor: z.number().nonnegative().int(),
  salesMinor: z.number().nonnegative().int(),
  currentBidMinor: z.number().nonnegative().int(),
});

const searchTermSchema = z.object({
  termId: z.string().min(1),
  term: z.string().min(1),
  clicks: z.number().nonnegative().int(),
  spendMinor: z.number().nonnegative().int(),
  salesMinor: z.number().nonnegative().int(),
  orders: z.number().nonnegative().int(),
});

export const connectedAccountScenarioContentSchema = z.object({
  campaignName: z.string().min(1),
  currencyCode: z.string().min(3).max(3),
  dailyBudgetMinor: z.number().nonnegative().int(),
  targetAcosPct: z.number().positive().max(100),
  breakEvenAcosPct: z.number().positive().max(100),
  revenuePerOrderMinor: z.number().positive().int(),
  keywords: z.array(keywordSchema).min(1),
  searchTerms: z.array(searchTermSchema).min(1),
});

export type ConnectedAccountScenarioContent = z.infer<typeof connectedAccountScenarioContentSchema>;
