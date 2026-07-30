/**
 * KeywordResearchOutput: output types for the Keyword Research simulator.
 *
 * STORY-081.
 *
 * Scoring dimensions (both derived directly from the dataset's own labels —
 * no invented ground truth):
 *  intentAccuracy        : % of keywords where the student's intent
 *                           classification matches the dataset's labeled
 *                           intent. An unclassified keyword counts as
 *                           incorrect, so partial triage cannot inflate
 *                           the score.
 *  negativeIdentification: F1 of the student's isNegative flags against
 *                           the dataset's ground truth (intent === "irrelevant").
 *                           F1 rather than raw accuracy because negatives
 *                           are typically a minority class — plain accuracy
 *                           would reward always answering "not negative".
 */

import type { KeywordDatasetSourceType, KeywordIntent } from "@/domain/entities/KeywordDataset";

export interface KeywordResearchKeywordResult {
  readonly term: string;
  readonly normalizedTerm: string;
  readonly monthlySearchVolume: number;
  readonly competitionIndex: number;
  readonly suggestedBidLow: number;
  readonly suggestedBidMedian: number;
  readonly suggestedBidHigh: number;
  readonly relevanceScore: number;
  readonly seasonalityIndex: number;
  readonly groundTruthIntent: KeywordIntent;
  readonly groundTruthIsNegative: boolean;
  readonly userIntent?: KeywordIntent;
  readonly userIsNegative?: boolean;
  readonly isIntentCorrect?: boolean;
}

export interface ScoreDimensions {
  readonly intentAccuracy: number;
  readonly negativeIdentification: number;
}

export interface KeywordResearchOutput {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly sourceType: KeywordDatasetSourceType;
  readonly categoryId: string;
  readonly nicheId: string;
  readonly keywords: readonly KeywordResearchKeywordResult[];
  /**
   * Legacy flat score: = round(mean(intentAccuracy, negativeIdentification))
   * when graded, = 100 otherwise (preview/no grading, matching the
   * Bid Elevator convention).
   */
  readonly score: number;
  /** Null when userClassifications were not supplied (preview only). */
  readonly scoreDimensions: ScoreDimensions | null;
}
