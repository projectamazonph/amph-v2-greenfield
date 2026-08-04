/**
 * scenarioContent.ts — parses a campaign-builder SimulatorScenario's
 * inputSchema into typed content.
 *
 * STORY-085. Not a "use server" file (unlike actions.ts) so it can export
 * a plain schema/type used by both the server component (page.tsx) and
 * the server actions (actions.ts).
 *
 * Genuinely all that exists — ground truth is procedurally generated from
 * hardcoded engine constants in CampaignBuilderSimulator (60/25/15 split,
 * BASE_CPC=0.4). Richer ground-truth authoring is STORY-084, not this story.
 */

import { z } from "zod";

export const campaignBuilderScenarioContentSchema = z.object({
  productCategory: z.string().min(1),
  productNiche: z.string().min(1),
  monthlyBudget: z.number().positive(),
});

export type CampaignBuilderScenarioContent = z.infer<typeof campaignBuilderScenarioContentSchema>;
