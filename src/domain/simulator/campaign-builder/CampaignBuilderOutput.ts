/**
 * CampaignBuilderOutput — output types for the Campaign Builder simulator.
 *
 * STORY-039: Campaign Builder simulator.
 */

export type MatchType = "exact" | "phrase" | "broad";

export interface KeywordSuggestion {
  readonly keyword: string;
  readonly matchType: MatchType;
  readonly suggestedBid: number;
}

export interface AdGroup {
  readonly name: string;
  readonly keywords: readonly KeywordSuggestion[];
  readonly suggestedBid: number;
}

export interface CampaignStructure {
  readonly name: string;
  readonly type: "sponsored-products" | "sponsored-brands" | "sponsored-display";
  readonly dailyBudget: number;
  readonly adGroups: readonly AdGroup[];
}

export interface CampaignBuilderOutput {
  readonly campaigns: readonly CampaignStructure[];
  /** Structural completeness score 0–100 */
  readonly score: number;
}
