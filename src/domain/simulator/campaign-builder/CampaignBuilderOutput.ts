/**
 * CampaignBuilderOutput — output types for the Campaign Builder simulator.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 *
 * When userAdjustedCampaigns are provided, the simulator evaluates the student's
 * self-built campaign structure against the ground-truth structure it generates,
 * computing per-dimension scores that feed into GradeSimulatorAttempt.
 *
 * Scoring dimensions:
 *  structureQuality   — % match of campaign types and ad group coverage
 *  budgetAllocation   — % of campaigns with budget within 50% of ground truth
 *  keywordRelevance  — % of user keywords containing niche terms
 *  explanation       — 100 (future: rubric-based on written justification)
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

export interface ScoreDimensions {
  /** % match of campaign types and ad group coverage vs. ground truth */
  readonly structureQuality: number;
  /** % of campaigns with budget within 50% of ground truth allocation */
  readonly budgetAllocation: number;
  /** % of user keywords containing words from the product niche */
  readonly keywordRelevance: number;
  /** Placeholder — future rubric-based on written justification */
  readonly explanation: number;
}

export interface CampaignBuilderOutput {
  readonly campaigns: readonly CampaignStructure[];
  /**
   * Legacy structural completeness score 0-100.
   * = structureQuality when grading (userAdjustedCampaigns provided),
   * = structural completeness formula otherwise.
   */
  readonly score: number;
  /**
   * Per-dimension scores (0-100) when userAdjustedCampaigns are provided.
   * Null when no user adjustments supplied (preview/ground-truth only).
   */
  readonly scoreDimensions: ScoreDimensions | null;
}
