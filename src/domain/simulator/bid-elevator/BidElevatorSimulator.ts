/**
 * BidElevatorSimulator — the real Bid Elevator PPC simulator.
 *
 * STORY-037: Bid Elevator simulator.
 *
 * Algorithm:
 *  1. Sort keywords by volume (highest first).
 *  2. Allocate budget proportionally to volume share.
 *  3. Suggested bid = allocated_budget_per_click / volume.
 *  4. Cap suggested bid at 2× current bid to stay conservative.
 *  5. Score = 100 if estimatedRoas ≥ targetRoas × 0.95; else scale 0–100 linearly.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { BidElevatorInput } from "./BidElevatorInput";
import type { BidElevatorOutput, KeywordRecommendation } from "./BidElevatorOutput";

export class BidElevatorSimulator implements Simulator<BidElevatorInput, BidElevatorOutput> {
  readonly simulatorId = "bid-elevator" as const;
  readonly name = "Bid Elevator";

  async run(input: BidElevatorInput): Promise<BidElevatorOutput> {
    const { keywords, budget, targetRoas } = input;

    if (keywords.length === 0 || budget <= 0) {
      return this.emptyResult();
    }

    const totalVolume = keywords.reduce((sum, k) => sum + k.volume, 0);
    if (totalVolume === 0) {
      return this.emptyResult();
    }

    // ── 1. Calculate volume-weighted bid recommendations ────────
    const recommendations: KeywordRecommendation[] = [];

    for (const keyword of keywords) {
      const volumeShare = keyword.volume / totalVolume;
      const allocatedBudget = budget * volumeShare;

      // Conservative estimate: bid = allocated_budget / expected_clicks
      // expected_clicks ≈ volume × CTR_estimate (assume 2% CTR)
      const estimatedClicks = keyword.volume * 0.02;
      const suggestedBid = estimatedClicks > 0 ? allocatedBudget / estimatedClicks : 0;

      // Cap bid growth at 2× current bid to stay conservative
      const cappedBid = Math.min(suggestedBid, keyword.currentBid * 2);

      recommendations.push({
        keyword: keyword.keyword,
        suggestedBid: Math.round(cappedBid * 100) / 100,
        currentBid: keyword.currentBid,
        estimatedCpc: keyword.currentCpc,
        volume: keyword.volume,
      });
    }

    // ── 2. Calculate estimated spend and ROAS ──────────────────
    const estimatedSpend = recommendations.reduce((sum, r) => {
      const clicks = r.volume * 0.02; // 2% CTR estimate
      return sum + clicks * r.suggestedBid;
    }, 0);

    const estimatedRevenue = estimatedSpend * targetRoas;
    const estimatedRoas = estimatedSpend > 0 ? estimatedRevenue / estimatedSpend : 0;

    // ── 3. Score: 0–100 based on ROAS hit ───────────────────
    const score = this.calculateScore(estimatedRoas, targetRoas);

    return {
      bids: recommendations.sort((a, b) => b.volume - a.volume),
      estimatedSpend: Math.round(estimatedSpend * 100) / 100,
      estimatedRoas: Math.round(estimatedRoas * 100) / 100,
      score,
    };
  }

  private calculateScore(estimatedRoas: number, targetRoas: number): number {
    if (targetRoas <= 0) return 0;

    const threshold = targetRoas * 0.95; // within 5% of target = full score

    if (estimatedRoas >= threshold) {
      return 100;
    }

    // Scale 0–100 linearly: hitting 0 ROAS = 0 score, hitting threshold = 100
    const ratio = Math.max(0, estimatedRoas / threshold);
    return Math.round(ratio * 100);
  }

  private emptyResult(): BidElevatorOutput {
    return {
      bids: [],
      estimatedSpend: 0,
      estimatedRoas: 0,
      score: 0,
    };
  }
}
