/**
 * scenarioContent.ts — parses a bid-elevator SimulatorScenario's
 * inputSchema into a typed scenario.
 *
 * STORY-085. Not a "use server" file (unlike actions.ts) so it can export
 * a plain schema/type used by both the server component (page.tsx) and
 * the server actions (actions.ts).
 */

import { z } from "zod";

const keywordScenarioSchema = z.object({
  keywordId: z.string().min(1),
  keyword: z.string().min(1),
  matchType: z.enum(["exact", "phrase", "broad"]),
  intent: z.enum(["branded", "generic", "competitor", "category"]),
  strategicRole: z.enum(["defense", "research", "performance"]),
  currentBid: z.number().nonnegative(),
  baselineBid: z.number().nonnegative(),
  baselineCtrPct: z.number().nonnegative(),
  baselineCvrPct: z.number().nonnegative(),
  revenuePerOrder: z.number().positive().optional(),
  benchmarkCpc: z.number().nonnegative(),
  availableImpressionsPerDay: z.number().nonnegative(),
  maxImpressionSharePct: z.number().min(0).max(100),
  bidElasticity: z.number().positive(),
  evidenceClicks: z.number().nonnegative(),
  evidenceOrders: z.number().nonnegative(),
  evidenceWindowDays: z.number().nonnegative(),
});

export const bidElevatorScenarioContentSchema = z.object({
  currencyCode: z.string().min(1),
  dailyBudget: z.number().positive(),
  simulationDays: z.number().positive(),
  targetRoas: z.number().positive(),
  breakEvenAcosPct: z.number().positive(),
  defaultRevenuePerOrder: z.number().positive(),
  minimumBidIncrement: z.number().positive(),
  maxBidChangePct: z.number().positive().optional(),
  keywords: z.array(keywordScenarioSchema).min(1),
});

export type BidElevatorScenarioContent = z.infer<typeof bidElevatorScenarioContentSchema>;
