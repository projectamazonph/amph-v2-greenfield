/**
 * BidElevatorInput — input types for the Bid Elevator simulator.
 *
 * STORY-068: Bid Elevator Rebuild (Scoring Engine Integration).
 */

export interface KeywordBid {
  readonly keyword: string;
  /** User's current bid in USD */
  readonly currentBid: number;
  /** Estimated CPC in USD */
  readonly currentCpc: number;
  /** Monthly search volume (impressions proxy) */
  readonly volume: number;
}

export interface BidElevatorInput {
  readonly keywords: readonly KeywordBid[];
  /** Daily budget in USD */
  readonly budget: number;
  /** Target Return on Ad Spend (e.g. 3.0 = 3x) */
  readonly targetRoas: number;
  /**
   * Optional user-submitted bid adjustments. Key = keyword, Value = user's bid.
   * When provided, the simulator grades the user's bids against the ground-truth
   * suggested bids and computes per-dimension scores.
   */
  readonly userBidAdjustments?: Readonly<Record<string, number>>;
}
