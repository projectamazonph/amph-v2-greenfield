/**
 * scenarioContent.ts — parses a keyword-research SimulatorScenario's
 * inputSchema into typed content.
 *
 * STORY-085. Not a "use server" file (unlike actions.ts) so it can export
 * a plain schema/type used by both the server component (page.tsx) and
 * the server actions (actions.ts).
 *
 * Intentionally minimal: KeywordDataset content (STORY-081) is its own
 * already-versioned system, not duplicated here. This scenario only
 * carries which niche is pre-filled by default — "publishing a new
 * version" of this simulator means changing that default, not
 * re-versioning dataset content.
 */

import { z } from "zod";

export const keywordResearchScenarioContentSchema = z.object({
  defaultNicheId: z.string().min(1),
});

export type KeywordResearchScenarioContent = z.infer<typeof keywordResearchScenarioContentSchema>;
