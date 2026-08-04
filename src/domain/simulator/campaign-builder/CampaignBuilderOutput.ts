/**
 * CampaignBuilderOutput: output types for the Campaign Builder simulator.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 * STORY-084: Campaign Builder strategic scoring. Expands the 3-dimension
 * scoring engine (structural completeness, ±50% budget tolerance, niche
 * substring match) to 7 dimensions covering negative-keyword routing,
 * duplicate-target detection, branded-traffic isolation, naming-convention
 * compliance, and tightened budget reconciliation (±2% total, ±10pp
 * per-role) — see docs/stories/STORY-084.md for the full decision record.
 *
 * When userAdjustedCampaigns are provided, the simulator evaluates the student's
 * self-built campaign structure against the ground-truth structure it generates,
 * computing per-dimension scores that feed into GradeSimulatorAttempt.
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

/**
 * STORY-084: negative keyword, carried per-campaign (not split across
 * campaign/adGroup as separate physical fields) — `level` records which
 * scope Ryan's routing decision intends, so grading can check it without
 * needing two parallel list shapes.
 */
export type NegativeMatchType = "negativeExact" | "negativePhrase";

export interface NegativeKeyword {
  readonly text: string;
  readonly matchType: NegativeMatchType;
  readonly level: "campaign" | "adGroup";
  readonly reason: string;
}

export interface CampaignStructure {
  readonly name: string;
  readonly type: "sponsored-products" | "sponsored-brands" | "sponsored-display";
  readonly dailyBudget: number;
  readonly adGroups: readonly AdGroup[];
  /** STORY-084. Optional — defaults to [] for callers that predate this field. */
  readonly negativeKeywords?: readonly NegativeKeyword[];
}

export interface ScoreDimensions {
  /** % of user keywords containing words from the product niche */
  readonly keywordRelevance: number;
  /** % match of campaign types + ad-group match-type purity vs. ground truth */
  readonly structureQuality: number;
  /** F1 of submitted negative keywords against the expected routing set (STORY-084) */
  readonly negativeRouting: number;
  /** ±2% total budget reconciliation + ±10pp per-role allocation accuracy (STORY-084) */
  readonly budgetAllocation: number;
  /** % of keywords correctly isolated: branded traffic only in the Brand campaign, no competitor terms (STORY-084) */
  readonly brandedIsolation: number;
  /** % of keyword targets that are not duplicated (same keyword+matchType) across ad groups (STORY-084) */
  readonly duplicateControl: number;
  /** % of campaigns matching the house naming convention (STORY-084) */
  readonly namingCompliance: number;
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
