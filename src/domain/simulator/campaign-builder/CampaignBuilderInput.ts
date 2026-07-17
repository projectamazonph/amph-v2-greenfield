/**
 * CampaignBuilderInput — input types for the Campaign Builder simulator.
 *
 * STORY-039: Campaign Builder simulator.
 */

export type TargetingStrategy = "auto" | "manual" | "hybrid";

export interface CampaignBuilderInput {
  readonly productCategory: string;
  readonly monthlyBudget: number;
  readonly targetingStrategy: TargetingStrategy;
  readonly productNiche: string;
}
