/**
 * BidElevatorSimulator: the real Bid Elevator PPC simulator.
 *
 * STORY-068: Bid Elevator Rebuild (Scoring Engine Integration).
 *
 * Ground truth algorithm:
 *  1. Sort keywords by volume (highest first).
 *  2. Allocate budget proportionally to volume share.
 *  3. Suggested bid = allocated_budget_per_click / volume.
 *  4. Cap suggested bid at 2× current bid to stay conservative.
 *
 * Grading (when userBidAdjustments provided):
 *  bidAccuracy    : % of keywords where |userBid - groundTruth| / groundTruth ≤ 0.20
 *  budgetAdherence: min(100, 100 × budget / userSpend)
 *  roasHit        : min(100, 100 × userRoas / targetRoas)
 *
 * Scoring dimensions (when userBidAdjustments provided):
 *  Per-dimension scores are fed to GradeSimulatorAttempt for persistence.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { BidElevatorInput } from "./BidElevatorInput";
import type { BidElevatorOutput, BidRecommendation, ScoreDimensions } from "./BidElevatorOutput";

const CTR = 0.02; // 2% CTR estimate

export class BidElevatorSimulator implements Simulator<BidElevatorInput, BidElevatorOutput> {
  readonly simulatorId = "bid-elevator" as const;
  readonly name = "Bid Elevator";

  async run(input: BidElevatorInput): Promise<BidElevatorOutput> {
    const { keywords, budget, targetRoas, userBidAdjustments } = input;

    if (keywords.length === 0 || budget <= 0) {
      return this.emptyResult();
    }

    const totalVolume = keywords.reduce((sum, k) => sum + k.volume, 0);
    if (totalVolume === 0) {
      return this.emptyResult();
    }

    // ── 1. Calculate ground-truth bid recommendations ──────────────
    const groundTruthBids: Map<string, number> = new Map();

    for (const keyword of keywords) {
      const volumeShare = keyword.volume / totalVolume;
      const allocatedBudget = budget * volumeShare;
      const estimatedClicks = keyword.volume * CTR;
      const suggestedBid = estimatedClicks > 0 ? allocatedBudget / estimatedClicks : 0;
      // Cap at 2× current bid to stay conservative
      groundTruthBids.set(
        keyword.keyword,
        Math.round(Math.min(suggestedBid, keyword.currentBid * 2) * 100) / 100,
      );
    }

    // ── 2. Build bids array with ground truth and (optional) user data ─
    const bids: BidRecommendation[] = [];

    for (const keyword of keywords) {
      const groundTruth = groundTruthBids.get(keyword.keyword)!;
      const userBid =
        userBidAdjustments !== undefined ? userBidAdjustments[keyword.keyword] : undefined;
      const isCorrect =
        userBid !== undefined ? this.isBidAccurate(userBid, groundTruth) : undefined;

      bids.push({
        keyword: keyword.keyword,
        groundTruth,
        currentBid: keyword.currentBid,
        estimatedCpc: keyword.currentCpc,
        volume: keyword.volume,
        ...(userBid !== undefined ? { userBid, isCorrect } : {}),
      });
    }

    // ── 3. Ground-truth spend and ROAS (returned as-is) ──────────
    const estimatedSpend = bids.reduce((sum, r) => sum + r.volume * CTR * r.groundTruth, 0);
    const estimatedRoas = targetRoas; // by construction of the ground truth algorithm

    // ── 4. Grade with user bids if provided ───────────────────────
    let scoreDimensions: ScoreDimensions | null = null;

    if (userBidAdjustments !== undefined) {
      // Compute spend based on user's actual bids (not ground truth)
      const userSpend = bids.reduce((sum, r) => {
        if (r.userBid === undefined) return sum;
        return sum + r.volume * CTR * r.userBid;
      }, 0);

      // Revenue model: revenue = spend × targetRoas (same model as ground truth)
      // User ROAS reflects whether the user's bids achieve the target
      const userRoas = userSpend > 0 ? targetRoas : 0;

      scoreDimensions = this.computeDimensionScores(bids, budget, userSpend, userRoas, targetRoas);
    }

    // Legacy flat score: bidAccuracy when grading, 100 when preview
    const score = scoreDimensions !== null ? scoreDimensions.bidAccuracy : 100;

    return {
      bids: bids.sort((a, b) => b.volume - a.volume),
      estimatedSpend: Math.round(estimatedSpend * 100) / 100,
      estimatedRoas: Math.round(estimatedRoas * 100) / 100,
      score,
      scoreDimensions,
    };
  }

  /**
   * Returns true if the user's bid is within ±20% of the ground truth.
   * Treats zero ground truth as always accurate (no cost risk).
   */
  private isBidAccurate(userBid: number, groundTruth: number): boolean {
    if (groundTruth === 0) return true;
    return Math.abs(userBid - groundTruth) / groundTruth <= 0.2;
  }

  private computeDimensionScores(
    bids: BidRecommendation[],
    budget: number,
    userSpend: number,
    userRoas: number,
    targetRoas: number,
  ): ScoreDimensions {
    // bidAccuracy: % of keywords correctly bid (within ±20% of ground truth)
    const reviewedBids = bids.filter((b) => b.userBid !== undefined);
    const correctCount = reviewedBids.filter((b) => b.isCorrect === true).length;
    const bidAccuracy =
      reviewedBids.length > 0 ? Math.round((correctCount / reviewedBids.length) * 100) : 0;

    // budgetAdherence: 100 when spend ≤ budget; scales down linearly when over budget
    // e.g. spend = 1.5× budget → score = 66
    const budgetAdherence =
      userSpend > 0 ? Math.min(100, Math.round((budget / userSpend) * 100)) : 100;

    // roasHit: % of target ROAS achieved, capped at 100
    // e.g. userRoas = 80% of target → 80; exceeds target → 100
    const roasHit = targetRoas > 0 ? Math.min(100, Math.round((userRoas / targetRoas) * 100)) : 0;

    return { bidAccuracy, budgetAdherence, roasHit };
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
