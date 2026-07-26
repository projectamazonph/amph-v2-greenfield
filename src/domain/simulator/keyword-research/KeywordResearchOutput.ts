/**
 * KeywordResearchOutput — output shape for the Keyword Research simulator.
 *
 * Returns the student's categorization results with scoring.
 */

export interface CriterionResult {
  readonly criterionId: string;
  readonly passed: boolean;
  readonly score: number; // 0-100 for this criterion
  readonly feedback: string;
}

export interface KeywordResearchOutput {
  readonly totalScore: number; // 0-100, weighted average of criteria
  readonly passed: boolean; // totalScore >= 70
  readonly overallFeedback: string;
  readonly criteriaResults: CriterionResult[];
  readonly priorityAccuracy: number; // % of keywords correctly prioritized
  readonly negativeRecall: number; // % of negatives correctly identified
  readonly negativePrecision: number; // % of false positives
  readonly primaryCoverage: number; // % of primary keywords covered
}
