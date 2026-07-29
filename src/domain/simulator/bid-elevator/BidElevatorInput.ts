/**
 * BidElevatorInput — input types for the Bid Elevator simulator.
 *
 * STORY-079: Bid Elevator economic model rewrite. Replaces the flat
 * fixed-CTR, volume-share-allocation model with scenario-authored
 * economics: every keyword carries its own baseline CTR/CVR, benchmark
 * CPC, available impression volume, and evidence counts, so ground
 * truth is reproducible from authored data rather than a hardcoded
 * constant. See docs/stories/STORY-079.md for the full formula set.
 */

export type MatchType = "exact" | "phrase" | "broad";
export type KeywordIntent = "branded" | "generic" | "competitor" | "category";
export type StrategicRole = "defense" | "research" | "performance";

export interface BidElevatorKeywordScenario {
  readonly keywordId: string;
  readonly keyword: string;
  readonly matchType: MatchType;
  readonly intent: KeywordIntent;
  readonly strategicRole: StrategicRole;
  /** Current bid in the scenario's currency. */
  readonly currentBid: number;
  /** Bid the baseline performance figures below were observed at. */
  readonly baselineBid: number;
  /** Baseline click-through rate, percent (e.g. 2.4 = 2.4%). */
  readonly baselineCtrPct: number;
  /** Baseline conversion rate, percent. */
  readonly baselineCvrPct: number;
  /** Optional override of the scenario's defaultRevenuePerOrder. */
  readonly revenuePerOrder?: number;
  /** Market-observed benchmark CPC for this keyword. */
  readonly benchmarkCpc: number;
  /** Total addressable daily impression volume at full competitiveness. */
  readonly availableImpressionsPerDay: number;
  /** Ceiling on impression share this keyword can realistically capture. */
  readonly maxImpressionSharePct: number;
  /** Curve steepness of impression share vs. bid ratio. */
  readonly bidElasticity: number;
  /** Observed clicks backing the baseline figures (confidence evidence). */
  readonly evidenceClicks: number;
  /** Observed orders backing the baseline figures (confidence evidence). */
  readonly evidenceOrders: number;
  /** Days of history the evidence counts were collected over. */
  readonly evidenceWindowDays: number;
}

export interface BidElevatorInput {
  readonly currencyCode: string;
  readonly dailyBudget: number;
  readonly simulationDays: number;
  /** Target Return on Ad Spend, e.g. 4.0 = 4x. */
  readonly targetRoas: number;
  /** Break-even ACoS, percent of sales (e.g. 35 = 35%). */
  readonly breakEvenAcosPct: number;
  readonly defaultRevenuePerOrder: number;
  readonly minimumBidIncrement: number;
  /** Optional per-optimization-round operational change guardrail, percent. */
  readonly maxBidChangePct?: number;
  readonly keywords: readonly BidElevatorKeywordScenario[];
  /**
   * Student-submitted bid adjustments, keyed by keywordId. When provided,
   * the simulator grades the student's bids against ground truth and
   * computes per-dimension scores.
   */
  readonly userBidAdjustments?: Readonly<Record<string, number>>;
}
