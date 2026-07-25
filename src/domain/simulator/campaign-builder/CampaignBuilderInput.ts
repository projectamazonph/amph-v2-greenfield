/**
 * CampaignBuilderInput — input types for the Campaign Builder simulator.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 */

import type { CampaignStructure } from "./CampaignBuilderOutput";

export type TargetingStrategy = "auto" | "manual" | "hybrid";

export interface CampaignBuilderInput {
  readonly productCategory: string;
  readonly monthlyBudget: number;
  readonly targetingStrategy: TargetingStrategy;
  readonly productNiche: string;
  /**
   * Optional student-submitted campaign structure. When provided, the simulator
   * grades the student's work against the ground-truth structure it generates,
   * computing per-dimension scores.
   */
  readonly userAdjustedCampaigns?: ReadonlyArray<CampaignStructure>;
}
