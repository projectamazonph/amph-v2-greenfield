/**
 * BidElevatorSimulator: the real Bid Elevator PPC simulator.
 *
 * STORY-079: Bid Elevator economic model rewrite. Replaces the fixed
 * 2% CTR, volume-share budget allocation, and flat 2x-current-bid cap
 * with scenario-authored economics. See docs/stories/STORY-079.md for
 * the full decision record this implements.
 *
 * Forecasting model (per keyword, at a chosen bid):
 *   bidRatio          = chosenBid / benchmarkCpc
 *   impressionShare   = maxImpressionShare * bidRatio^elasticity / (1 + bidRatio^elasticity)
 *   estimatedCpc      = min(chosenBid, benchmarkCpc * (0.75 + 0.25 * min(bidRatio, 1.5)))
 *   estimatedClicks   = availableImpressionsPerDay * simulationDays * impressionShare * baselineCtr
 *   estimatedSpend    = estimatedClicks * estimatedCpc
 *   estimatedOrders   = estimatedClicks * baselineCvr
 *   estimatedSales    = estimatedOrders * revenuePerOrder
 *
 * If a campaign's unconstrained spend would exceed the available budget
 * (dailyBudget * simulationDays), delivered volume is scaled down
 * uniformly (the standard proxy for pacing/throttling) rather than
 * pretending the budget is manually assigned per keyword.
 *
 * Ground truth per keyword is the bid, at or below the economic ceiling
 * (maxEconomicCpc = baselineCvr * revenuePerOrder * min(targetAcos,
 * breakEvenAcos)), that maximizes projected sales. This is found by a
 * deterministic search over the [minimumBidIncrement, ceiling] range —
 * not assumed to always equal the ceiling, because impression share
 * saturates: once a bid captures ~maxImpressionSharePct, bidding higher
 * adds spend without adding sales, which lowers ROAS for no benefit.
 * Among bids tied for the best projected sales, the smallest wins.
 *
 * Grading combines an evidence-based per-keyword bid-accuracy check
 * with campaign-level outcome grading (did the student's bids hit
 * target ROAS and capture most of the best feasible sales).
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { BidElevatorInput, BidElevatorKeywordScenario } from "./BidElevatorInput";
import type {
  BidElevatorOutput,
  BidRecommendation,
  BidConfidence,
  ScoreDimensions,
} from "./BidElevatorOutput";

interface KeywordForecast {
  readonly impressionShare: number;
  readonly estimatedImpressions: number;
  readonly estimatedClicks: number;
  readonly estimatedCpc: number;
  readonly estimatedSpend: number;
  readonly estimatedOrders: number;
  readonly estimatedSales: number;
  readonly keywordRoas: number;
}

interface CampaignForecast {
  readonly perKeyword: ReadonlyMap<string, KeywordForecast>;
  readonly budgetScale: number;
  readonly totalSpend: number;
  readonly totalSales: number;
}

const SEARCH_STEPS = 20;
const ROAS_FULL_CREDIT_CAPTURE = 0.9;
const OVER_CEILING_CAP = 40;
const CONSERVATIVE_CAP = 89;

export class BidElevatorSimulator implements Simulator<BidElevatorInput, BidElevatorOutput> {
  readonly simulatorId = "bid-elevator" as const;
  readonly name = "Bid Elevator";

  async run(input: BidElevatorInput): Promise<BidElevatorOutput> {
    const { keywords, dailyBudget, simulationDays, userBidAdjustments } = input;

    if (keywords.length === 0 || dailyBudget <= 0 || simulationDays <= 0) {
      return this.emptyResult();
    }

    // ── 1. Per-keyword economic ceiling + recommended bid ────────────
    const ceilings = new Map<string, number>();
    const groundTruthBids = new Map<string, number>();
    const confidences = new Map<string, BidConfidence>();

    for (const kw of keywords) {
      const ceiling = this.economicCeiling(kw, input);
      ceilings.set(kw.keywordId, ceiling);
      groundTruthBids.set(kw.keywordId, this.recommendBid(kw, input, ceiling));
      confidences.set(kw.keywordId, this.confidenceTier(kw));
    }

    // ── 2. Ground-truth campaign forecast (recommended bids) ─────────
    const groundTruthCampaign = this.forecastCampaign(
      keywords,
      (kw) => groundTruthBids.get(kw.keywordId)!,
      input,
    );

    // ── 3. Build the bids array ───────────────────────────────────────
    const bids: BidRecommendation[] = keywords.map((kw) => {
      const forecast = groundTruthCampaign.perKeyword.get(kw.keywordId)!;
      const userBid = userBidAdjustments?.[kw.keywordId];
      const groundTruth = groundTruthBids.get(kw.keywordId)!;
      const isCorrect =
        userBid !== undefined ? this.isBidAccurate(kw, input, groundTruth, userBid) : undefined;

      return {
        keywordId: kw.keywordId,
        keyword: kw.keyword,
        matchType: kw.matchType,
        intent: kw.intent,
        strategicRole: kw.strategicRole,
        groundTruth: this.round2(groundTruth),
        currentBid: kw.currentBid,
        benchmarkCpc: kw.benchmarkCpc,
        economicCeiling: this.round2(ceilings.get(kw.keywordId)!),
        estimatedImpressions: Math.round(forecast.estimatedImpressions),
        estimatedClicks: Math.round(forecast.estimatedClicks),
        estimatedCpc: this.round2(forecast.estimatedCpc),
        estimatedSpend: this.round2(forecast.estimatedSpend),
        estimatedOrders: Math.round(forecast.estimatedOrders * 100) / 100,
        estimatedSales: this.round2(forecast.estimatedSales),
        keywordRoas: this.round2(forecast.keywordRoas),
        confidence: confidences.get(kw.keywordId)!,
        ...(userBid !== undefined ? { userBid, isCorrect } : {}),
      };
    });

    // ── 4. Grade with user bids if provided ───────────────────────────
    let scoreDimensions: ScoreDimensions | null = null;

    if (userBidAdjustments !== undefined) {
      const userCampaign = this.forecastCampaign(
        keywords,
        (kw) => userBidAdjustments[kw.keywordId] ?? kw.currentBid,
        input,
      );
      scoreDimensions = this.computeDimensionScores(
        keywords,
        input,
        bids,
        ceilings,
        userBidAdjustments,
        groundTruthCampaign,
        userCampaign,
      );
    }

    const score = scoreDimensions !== null ? scoreDimensions.bidAccuracy : 100;

    return {
      bids: [...bids].sort((a, b) => {
        const aKw = keywords.find((k) => k.keywordId === a.keywordId)!;
        const bKw = keywords.find((k) => k.keywordId === b.keywordId)!;
        return bKw.availableImpressionsPerDay - aKw.availableImpressionsPerDay;
      }),
      estimatedSpend: this.round2(groundTruthCampaign.totalSpend),
      estimatedRoas:
        groundTruthCampaign.totalSpend > 0
          ? this.round2(groundTruthCampaign.totalSales / groundTruthCampaign.totalSpend)
          : 0,
      score,
      scoreDimensions,
    };
  }

  // ── Economic ceiling ─────────────────────────────────────────────────

  private economicCeiling(kw: BidElevatorKeywordScenario, scenario: BidElevatorInput): number {
    const targetAcos = scenario.targetRoas > 0 ? 1 / scenario.targetRoas : 0;
    const effectiveTargetAcos = Math.min(targetAcos, scenario.breakEvenAcosPct / 100);
    const revenuePerOrder = kw.revenuePerOrder ?? scenario.defaultRevenuePerOrder;
    return Math.max(0, (kw.baselineCvrPct / 100) * revenuePerOrder * effectiveTargetAcos);
  }

  // ── Recommended bid: deterministic search for max-sales bid at/below ceiling ─

  private recommendBid(
    kw: BidElevatorKeywordScenario,
    scenario: BidElevatorInput,
    ceiling: number,
  ): number {
    if (ceiling <= 0) return 0;

    const floor = Math.min(scenario.minimumBidIncrement, ceiling);
    let bestBid = floor;
    let bestSales = -Infinity;

    for (let i = 0; i <= SEARCH_STEPS; i++) {
      const candidate = floor + (ceiling - floor) * (i / SEARCH_STEPS);
      const forecast = this.forecastKeywordUnconstrained(kw, candidate, scenario);
      // A relative threshold (not a tiny absolute epsilon) so that once
      // impression share saturates, negligible fractional gains stop
      // moving the recommendation -- the search settles on the cheapest
      // bid that already captures ~all the achievable sales, rather than
      // always drifting to the ceiling.
      if (forecast.estimatedSales > bestSales * (1 + 1e-3) + 1e-6) {
        bestSales = forecast.estimatedSales;
        bestBid = candidate;
      }
    }

    let recommended = this.roundToIncrement(bestBid, scenario.minimumBidIncrement);

    if (scenario.maxBidChangePct !== undefined) {
      const maxDelta = kw.currentBid * (scenario.maxBidChangePct / 100);
      const lo = Math.max(0, kw.currentBid - maxDelta);
      const hi = Math.min(ceiling, kw.currentBid + maxDelta);
      recommended = Math.min(Math.max(recommended, lo), Math.max(lo, hi));
    }

    return Math.min(recommended, ceiling);
  }

  // ── Per-keyword forecast (no budget pacing applied) ──────────────────

  private forecastKeywordUnconstrained(
    kw: BidElevatorKeywordScenario,
    chosenBid: number,
    scenario: BidElevatorInput,
  ): KeywordForecast {
    const maxShare = kw.maxImpressionSharePct / 100;
    const bidRatio = kw.benchmarkCpc > 0 ? chosenBid / kw.benchmarkCpc : 0;
    const elasticityTerm = bidRatio > 0 ? Math.pow(bidRatio, kw.bidElasticity) : 0;
    const impressionShare = bidRatio > 0 ? (maxShare * elasticityTerm) / (1 + elasticityTerm) : 0;
    const estimatedCpc = Math.min(
      chosenBid,
      kw.benchmarkCpc * (0.75 + 0.25 * Math.min(bidRatio, 1.5)),
    );
    const estimatedImpressions =
      kw.availableImpressionsPerDay * scenario.simulationDays * impressionShare;
    const estimatedClicks = estimatedImpressions * (kw.baselineCtrPct / 100);
    const estimatedSpend = estimatedClicks * estimatedCpc;
    const estimatedOrders = estimatedClicks * (kw.baselineCvrPct / 100);
    const revenuePerOrder = kw.revenuePerOrder ?? scenario.defaultRevenuePerOrder;
    const estimatedSales = estimatedOrders * revenuePerOrder;
    const keywordRoas = estimatedSpend > 0 ? estimatedSales / estimatedSpend : 0;

    return {
      impressionShare,
      estimatedImpressions,
      estimatedClicks,
      estimatedCpc,
      estimatedSpend,
      estimatedOrders,
      estimatedSales,
      keywordRoas,
    };
  }

  // ── Campaign-level forecast: unconstrained + budget pacing ───────────

  private forecastCampaign(
    keywords: readonly BidElevatorKeywordScenario[],
    chosenBidFor: (kw: BidElevatorKeywordScenario) => number,
    scenario: BidElevatorInput,
  ): CampaignForecast {
    const unconstrained = new Map<string, KeywordForecast>();
    for (const kw of keywords) {
      unconstrained.set(
        kw.keywordId,
        this.forecastKeywordUnconstrained(kw, chosenBidFor(kw), scenario),
      );
    }

    const unconstrainedSpend = [...unconstrained.values()].reduce(
      (s, f) => s + f.estimatedSpend,
      0,
    );
    const availableBudgetTotal = scenario.dailyBudget * scenario.simulationDays;
    const budgetScale =
      unconstrainedSpend > availableBudgetTotal && unconstrainedSpend > 0
        ? availableBudgetTotal / unconstrainedSpend
        : 1;

    const scaled = new Map<string, KeywordForecast>();
    for (const [keywordId, forecast] of unconstrained) {
      scaled.set(keywordId, {
        impressionShare: forecast.impressionShare,
        estimatedImpressions: forecast.estimatedImpressions * budgetScale,
        estimatedClicks: forecast.estimatedClicks * budgetScale,
        estimatedCpc: forecast.estimatedCpc,
        estimatedSpend: forecast.estimatedSpend * budgetScale,
        estimatedOrders: forecast.estimatedOrders * budgetScale,
        estimatedSales: forecast.estimatedSales * budgetScale,
        keywordRoas: forecast.keywordRoas,
      });
    }

    const totalSpend = [...scaled.values()].reduce((s, f) => s + f.estimatedSpend, 0);
    const totalSales = [...scaled.values()].reduce((s, f) => s + f.estimatedSales, 0);

    return { perKeyword: scaled, budgetScale, totalSpend, totalSales };
  }

  // ── Evidence-based confidence + tolerance ────────────────────────────

  private confidenceTier(kw: BidElevatorKeywordScenario): BidConfidence {
    if (kw.evidenceClicks >= 30 && kw.evidenceOrders >= 3) return "high";
    if (kw.evidenceClicks >= 15 || kw.evidenceOrders >= 2) return "medium";
    return "low";
  }

  private confidenceTolerancePct(tier: BidConfidence): number {
    switch (tier) {
      case "high":
        return 0.1;
      case "medium":
        return 0.15;
      case "low":
        return 0.2;
    }
  }

  private isBidAccurate(
    kw: BidElevatorKeywordScenario,
    scenario: BidElevatorInput,
    groundTruth: number,
    userBid: number,
  ): boolean {
    const tier = this.confidenceTier(kw);
    const pct = this.confidenceTolerancePct(tier);
    const allowedDelta = Math.max(5 * scenario.minimumBidIncrement, groundTruth * pct);
    return Math.abs(userBid - groundTruth) <= allowedDelta;
  }

  // ── Dimension scoring ─────────────────────────────────────────────────

  private computeDimensionScores(
    keywords: readonly BidElevatorKeywordScenario[],
    scenario: BidElevatorInput,
    bids: readonly BidRecommendation[],
    ceilings: ReadonlyMap<string, number>,
    userBidAdjustments: Readonly<Record<string, number>>,
    groundTruthCampaign: CampaignForecast,
    userCampaign: CampaignForecast,
  ): ScoreDimensions {
    // bidAccuracy: % of reviewed keywords within the evidence-based tolerance band
    const reviewed = bids.filter((b) => b.userBid !== undefined);
    const correctCount = reviewed.filter((b) => b.isCorrect === true).length;
    const bidAccuracy =
      reviewed.length > 0 ? Math.round((correctCount / reviewed.length) * 100) : 0;

    // budgetAdherence: how much the user's bids stayed within budget before pacing throttled
    const budgetAdherence = Math.round(Math.min(1, userCampaign.budgetScale) * 100);

    // roasHit: outcome grading (full / partial / capped)
    const bestFeasibleSales = groundTruthCampaign.totalSales;
    const capturePct = bestFeasibleSales > 0 ? userCampaign.totalSales / bestFeasibleSales : 1;
    const userRoas =
      userCampaign.totalSpend > 0 ? userCampaign.totalSales / userCampaign.totalSpend : 0;

    const anyOverCeiling = keywords.some((kw) => {
      const userBid = userBidAdjustments[kw.keywordId];
      // Epsilon guard: a bid submitted at exactly the recommended (and
      // therefore at-ceiling) value must not be flagged as "over" the
      // ceiling due to floating-point noise from the search/rounding.
      return userBid !== undefined && userBid > ceilings.get(kw.keywordId)! + 1e-6;
    });

    let roasHit: number;
    if (anyOverCeiling) {
      roasHit = Math.min(OVER_CEILING_CAP, Math.round(capturePct * 100));
    } else if (userRoas >= scenario.targetRoas && capturePct >= ROAS_FULL_CREDIT_CAPTURE) {
      roasHit = 100;
    } else {
      roasHit = Math.min(CONSERVATIVE_CAP, Math.round(capturePct * 100));
    }
    roasHit = Math.max(0, Math.min(100, roasHit));

    return { bidAccuracy, budgetAdherence, roasHit };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private roundToIncrement(value: number, increment: number): number {
    if (!(increment > 0)) return Math.round(value * 100) / 100;
    return Math.round(value / increment) * increment;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private emptyResult(): BidElevatorOutput {
    return {
      bids: [],
      estimatedSpend: 0,
      estimatedRoas: 0,
      score: 0,
      scoreDimensions: null,
    };
  }
}
