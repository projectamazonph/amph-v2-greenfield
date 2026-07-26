/**
 * BidElevatorOutput: output types for the Bid Elevator simulator.
 *
 * STORY-068: Bid Elevator Rebuild (Scoring Engine Integration).
 *
 * When userBidAdjustments are provided, the simulator evaluates each keyword's
 * user-submitted bid against the ground-truth suggested bid and returns per-dimension
 * scores that feed into GradeSimulatorAttempt.
 *
 * Scoring dimensions:
 *  bidAccuracy     : % of keywords where user's bid is within ±20% of suggested bid
 *  budgetAdherence : % of simulated spend staying within daily budget (capped at 100)
 *  roasHit         : % of target ROAS achieved (capped at 100)
 */

import type { KeywordBid } from "./BidElevatorInput";

export interface BidRecommendation {
  readonly keyword: string;
  /** Simulator's ground-truth suggested bid */
  readonly groundTruth: number;
  /** User's current bid from the scenario */
  readonly currentBid: number;
  /** Estimated CPC for this keyword */
  readonly estimatedCpc: number;
  /** Monthly search volume */
  readonly volume: number;
  /** User's submitted bid adjustment (undefined = not yet submitted) */
  readonly userBid?: number;
  /** Whether user's bid is within ±20% of ground truth */
  readonly isCorrect?: boolean;
}

export interface ScoreDimensions {
  /** % of keywords correctly bid (within ±20% of suggested bid) */
  readonly bidAccuracy: number;
  /** % of simulated spend staying within daily budget (capped at 100) */
  readonly budgetAdherence: number;
  /** % of target ROAS achieved (capped at 100) */
  readonly roasHit: number;
  /** Placeholder: future rubric-based on written justification */
}

export interface BidElevatorOutput {
  /** Bid recommendations per keyword, ordered by volume descending */
  readonly bids: readonly BidRecommendation[];
  /** Total estimated daily spend with the selected bids */
  readonly estimatedSpend: number;
  /** Estimated ROAS with the selected bids */
  readonly estimatedRoas: number;
  /**
   * Legacy flat score: preserved for backward compatibility.
   * = bidAccuracy when grading (userBidAdjustments provided),
   * = 100 otherwise (no grading, just ground truth).
   */
  readonly score: number;
  /**
   * Per-dimension scores (0–100) when userBidAdjustments are provided.
   * Null when no user adjustments supplied (preview/ground-truth only).
   */
  readonly scoreDimensions: ScoreDimensions | null;
}
