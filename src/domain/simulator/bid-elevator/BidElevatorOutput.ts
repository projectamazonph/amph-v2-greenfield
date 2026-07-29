/**
 * BidElevatorOutput: output types for the Bid Elevator simulator.
 *
 * STORY-079: Bid Elevator economic model rewrite.
 *
 * Scoring dimensions:
 *  bidAccuracy     : % of reviewed keywords within the evidence-based
 *                    tolerance band of the recommended bid
 *  budgetAdherence : how much the student's bids stayed within the daily
 *                    budget before pacing had to throttle delivery
 *  roasHit         : outcome grading — full credit when target ROAS is
 *                    met and at least 90% of best feasible sales is
 *                    captured, partial credit for a safe-but-conservative
 *                    bid, capped when any bid exceeds its economic ceiling
 */

import type { MatchType, KeywordIntent, StrategicRole } from "./BidElevatorInput";

export type BidConfidence = "high" | "medium" | "low";

export interface BidRecommendation {
  readonly keywordId: string;
  readonly keyword: string;
  readonly matchType: MatchType;
  readonly intent: KeywordIntent;
  readonly strategicRole: StrategicRole;
  /** The simulator's recommended bid: the best candidate at or below the economic ceiling. */
  readonly groundTruth: number;
  readonly currentBid: number;
  readonly benchmarkCpc: number;
  /** Maximum defensible CPC (baselineCvr × revenuePerOrder × effectiveTargetAcos). */
  readonly economicCeiling: number;
  readonly estimatedImpressions: number;
  readonly estimatedClicks: number;
  readonly estimatedCpc: number;
  readonly estimatedSpend: number;
  readonly estimatedOrders: number;
  readonly estimatedSales: number;
  readonly keywordRoas: number;
  /** Evidence-based confidence tier used to derive this keyword's tolerance band. */
  readonly confidence: BidConfidence;
  /** Student's submitted bid (undefined = not yet reviewed). */
  readonly userBid?: number;
  /** Whether the student's bid is within the evidence-based tolerance band. */
  readonly isCorrect?: boolean;
}

export interface ScoreDimensions {
  readonly bidAccuracy: number;
  readonly budgetAdherence: number;
  readonly roasHit: number;
}

export interface BidElevatorOutput {
  /** Bid recommendations per keyword, ordered by available impression volume descending. */
  readonly bids: readonly BidRecommendation[];
  /** Campaign-level projected daily spend using the recommended bids. */
  readonly estimatedSpend: number;
  /** Campaign-level projected ROAS using the recommended bids. */
  readonly estimatedRoas: number;
  /**
   * Legacy flat score: preserved for backward compatibility.
   * = bidAccuracy when grading (userBidAdjustments provided),
   * = 100 otherwise (no grading, just ground truth).
   */
  readonly score: number;
  /**
   * Per-dimension scores (0-100) when userBidAdjustments are provided.
   * Null when no user adjustments supplied (preview/ground-truth only).
   */
  readonly scoreDimensions: ScoreDimensions | null;
}
