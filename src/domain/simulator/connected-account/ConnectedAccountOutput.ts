/**
 * ConnectedAccountOutput — output types for the Connected-Account Simulator.
 *
 * STORY-089. The simulator grades a student's response to a mock
 * Amazon Advertising API snapshot against two ground-truth signals
 * baked into the scenario (the keywords' pre-computed optimal bids,
 * and the search terms' pre-computed winner/bleeder classification).
 *
 * Scoring dimensions (both formative; never used as a hiring or
 * certification signal per the simulator-accuracy audit):
 *
 *   bidAccuracy    : how close the student's per-keyword new bid is to
 *                    the ground-truth optimal bid (within ±5% of target
 *                    ACoS at the keyword's observed economics). Scored
 *                    0-100 as the share of keywords landing in the
 *                    optimal band.
 *   triageAccuracy : how many of the student's STR triage actions
 *                    match the ground-truth action (keep winners as
 *                    keep/optimize, flag bleeders as pause/negate).
 *                    Scored 0-100 as the share of search terms where
 *                    the student's action is in the right set.
 *
 *   score          : legacy flat score (mean of dimensions) when
 *                    graded, = 100 otherwise (preview-only). Formative
 *                    only.
 */

import type {
  ConnectedAccountBidDecision,
  ConnectedAccountSearchTerm,
  ConnectedAccountTriageAction,
  ConnectedAccountTriageDecision,
} from "./ConnectedAccountInput";

export interface ConnectedAccountKeywordResult {
  readonly keywordId: string;
  readonly keyword: string;
  readonly matchType: "exact" | "phrase" | "broad";
  readonly impressions: number;
  readonly clicks: number;
  readonly spendMinor: number;
  readonly salesMinor: number;
  readonly currentBidMinor: number;
  /** Ground-truth optimal bid, computed from the keyword's CTR, CVR, and target ACoS. */
  readonly optimalBidMinor: number;
  /** True when the scenario marks this keyword as a winner (sales > 0 and within target ACoS). */
  readonly isWinner: boolean;
  /** True when the scenario marks this keyword as a bleeder (clicks > 0 and no sales). */
  readonly isBleeder: boolean;
  /** User-supplied new bid, when supplied; otherwise undefined. */
  readonly userNewBidMinor?: number;
  /** True when the user's new bid lands within ±5% of the optimal bid. */
  readonly isBidOptimal?: boolean;
}

export interface ConnectedAccountSearchTermResult {
  readonly termId: string;
  readonly term: string;
  readonly clicks: number;
  readonly spendMinor: number;
  readonly salesMinor: number;
  readonly orders: number;
  /** Ground-truth triage action for this search term. */
  readonly groundTruthAction: ConnectedAccountTriageAction;
  /** User-supplied triage action, when supplied; otherwise undefined. */
  readonly userAction?: ConnectedAccountTriageAction;
  /** True when the user's action matches the ground truth, or both are in the same equivalence class. */
  readonly isTriageCorrect?: boolean;
}

export interface ConnectedAccountScoreDimensions {
  readonly bidAccuracy: number;
  readonly triageAccuracy: number;
}

export interface ConnectedAccountOutput {
  readonly campaignName: string;
  readonly currencyCode: string;
  readonly dailyBudgetMinor: number;
  readonly targetAcosPct: number;
  readonly keywords: readonly ConnectedAccountKeywordResult[];
  readonly searchTerms: readonly ConnectedAccountSearchTermResult[];
  /** Legacy flat score: = round(mean(bidAccuracy, triageAccuracy)) when graded, = 100 otherwise. */
  readonly score: number;
  /** Null when bidDecisions and triageDecisions were not supplied (preview only). */
  readonly scoreDimensions: ConnectedAccountScoreDimensions | null;
}

export type {
  ConnectedAccountBidDecision,
  ConnectedAccountSearchTerm,
  ConnectedAccountTriageAction,
  ConnectedAccountTriageDecision,
} from "./ConnectedAccountInput";
