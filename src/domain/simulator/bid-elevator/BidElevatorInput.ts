/**
 * BidElevatorInput — input types for the Bid Elevator simulator.
 *
 * STORY-037: Bid Elevator simulator.
 */

export interface KeywordBid {
  readonly keyword: string;
  readonly currentBid: number; // user's current bid in USD
  readonly currentCpc: number; // estimated CPC in USD
  readonly volume: number; // monthly search volume (impressions proxy)
}

export interface BidElevatorInput {
  readonly keywords: readonly KeywordBid[];
  readonly budget: number; // daily budget in USD
  readonly targetRoas: number; // target Return on Ad Spend (e.g. 3.0 = 3x)
}
