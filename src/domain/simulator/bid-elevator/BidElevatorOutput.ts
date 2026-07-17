/**
 * BidElevatorOutput — output types for the Bid Elevator simulator.
 *
 * STORY-037: Bid Elevator simulator.
 */

import type { KeywordBid } from "./BidElevatorInput";

export interface KeywordRecommendation {
  readonly keyword: string;
  readonly suggestedBid: number;
  readonly currentBid: number;
  readonly estimatedCpc: number;
  readonly volume: number;
}

export interface BidElevatorOutput {
  /** Suggested bids for each keyword, ordered by volume descending */
  readonly bids: readonly KeywordRecommendation[];
  /** Total estimated daily spend with suggested bids */
  readonly estimatedSpend: number;
  /** Estimated ROAS with suggested bids */
  readonly estimatedRoas: number;
  /** Score 0–100: how well the suggested bids hit the target ROAS */
  readonly score: number;
}
