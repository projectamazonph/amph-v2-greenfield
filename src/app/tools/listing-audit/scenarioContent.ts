/**
 * scenarioContent.ts — parses a listing-audit SimulatorScenario's
 * inputSchema into typed content.
 *
 * STORY-085. Not a "use server" file (unlike actions.ts) so it can export
 * a plain schema/type used by both the server component (page.tsx) and
 * the server actions (actions.ts).
 */

import { z } from "zod";

export const listingAuditScenarioContentSchema = z.object({
  category: z.string().min(1),
  niche: z.string().min(1),
  bullets: z.array(z.string()).default([]),
  description: z.string().default(""),
  images: z.array(z.unknown()).default([]),
  hasVideo: z.boolean().default(false),
  hasAPlus: z.boolean().default(false),
  marketplace: z.string().default("US"),
});

export type ListingAuditScenarioContent = z.infer<typeof listingAuditScenarioContentSchema>;
