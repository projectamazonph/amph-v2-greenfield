/**
 * StrTriageSimulator: categorizes Amazon PPC keyword data into action buckets.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 *
 * Classification rules (checked in priority order):
 *  add_as_exact: ROAS >= targetRoas × 0.8 but spend ratio < 0.3 (low-hanging fruit)
 *  add_as_phrase: ROAS >= targetRoas × 0.7 but < targetRoas, spend ratio >= 0.5 (marginal)
 *  pause       : ROAS < targetRoas AND spend ratio > 0.8 (over-spending bad keywords)
 *  keep        : default: healthy ROAS with reasonable spend
 *
 * When userClassifications are provided, computes per-dimension scores:
 *  direction     : % of keywords correctly classified
 *  profitability : % of non-pausable revenue preserved (genuinely
 *                   revenue-based, so this name is accurate and stays)
 *  reviewCoverage: % of rows the user assigned an action to (completion,
 *                   NOT graded; was `dataSufficiency`)
 *
 * Sprint 14 removed the hardcoded `explanation: 100` that policies weighted
 * 10%, and stopped grading completion. See
 * docs/audit-2026-07-26-simulator-accuracy-review.md.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { StrTriageInput } from "./StrTriageInput";
import type {
  StrTriageOutput,
  KeywordClassification,
  TriageAction,
  ScoreDimensions,
} from "./StrTriageOutput";

export class StrTriageSimulator implements Simulator<StrTriageInput, StrTriageOutput> {
  readonly simulatorId = "str-triage" as const;
  readonly name = "STR Triage";

  async run(input: StrTriageInput): Promise<StrTriageOutput> {
    const { rows, targetRoas, userClassifications } = input;

    if (rows.length === 0) {
      return this.emptyResult();
    }

    const classifications: KeywordClassification[] = rows.map((row) => {
      const groundTruth = this.classify(row, targetRoas);
      const userChoice = userClassifications?.[row.keyword];
      const isCorrect = userChoice !== undefined && userChoice === groundTruth;

      return {
        keyword: row.keyword,
        groundTruth,
        userChoice,
        roas: this.calcRoas(row),
        spend: row.spend,
        isCorrect,
      };
    });

    const scoreDimensions =
      userClassifications !== undefined
        ? this.computeDimensionScores(classifications, [...rows])
        : null;

    // Legacy flat score: direction % when grading, 100 when preview
    const score = scoreDimensions !== null ? scoreDimensions.direction : 100;

    return { classifications, scoreDimensions, score };
  }

  /**
   * Compute per-dimension scores from user classifications.
   */
  private computeDimensionScores(
    classifications: KeywordClassification[],
    rows: { keyword: string; revenue: number }[],
  ): ScoreDimensions {
    return {
      direction: this.scoreDirection(classifications),
      profitability: this.scoreProfitability(classifications, rows),
      reviewCoverage: this.scoreReviewCoverage(classifications, rows),
    };
  }

  /**
   * Direction score: % of keywords where user choice matches ground truth.
   */
  private scoreDirection(classifications: KeywordClassification[]): number {
    if (classifications.length === 0) return 100;
    const correct = classifications.filter((c) => c.isCorrect).length;
    return Math.round((correct / classifications.length) * 100);
  }

  /**
   * Profitability score: % of non-pausable revenue preserved by user's decisions.
   *
   * A keyword is "pausable" if its groundTruth === "pause".
   * We penalize pausing a non-pausable keyword (lost revenue) and
   * reward keeping/add_as_exact/add_as_phrase for non-pausable keywords.
   * For pausable keywords, any action is neutral (it's fine to pause them,
   * but also fine to keep them if ROAS is near target).
   */
  private scoreProfitability(
    classifications: KeywordClassification[],
    rows: { keyword: string; revenue: number }[],
  ): number {
    if (classifications.length === 0) return 100;

    // Build a map of keyword -> revenue
    const revenueByKeyword = new Map<string, number>();
    for (const row of rows) {
      revenueByKeyword.set(row.keyword, row.revenue);
    }

    // Find total non-pausable revenue
    let nonPausableRevenue = 0;
    for (const c of classifications) {
      if (c.groundTruth !== "pause") {
        nonPausableRevenue += revenueByKeyword.get(c.keyword) ?? 0;
      }
    }

    if (nonPausableRevenue === 0) return 100; // all keywords are pausable: neutral

    // Find non-pausable revenue that was preserved (not wrongly paused)
    let preservedRevenue = 0;
    for (const c of classifications) {
      if (c.groundTruth !== "pause") {
        // Correctly kept or added keywords preserve revenue
        if (c.userChoice === c.groundTruth) {
          preservedRevenue += revenueByKeyword.get(c.keyword) ?? 0;
        }
        // Also preserve revenue for correct add_as_* keywords
      }
    }

    return Math.round((preservedRevenue / nonPausableRevenue) * 100);
  }

  /**
   * Review coverage: % of rows that have a userChoice assigned.
   *
   * Completion, not judgement, so it is reported but no longer graded.
   * Was `scoreDataSufficiency`. STORY-072, STORY-076.
   */
  private scoreReviewCoverage(
    classifications: KeywordClassification[],
    rows: ReadonlyArray<{ keyword: string }>,
  ): number {
    if (rows.length === 0) return 100;
    const reviewed = classifications.filter((c) => c.userChoice !== undefined).length;
    return Math.round((reviewed / rows.length) * 100);
  }

  private classify(row: { spend: number; revenue: number }, targetRoas: number): TriageAction {
    const roas = this.calcRoas(row);
    const avgSpendPerKeyword = 25; // assumed budget per keyword for classification
    const spendRatio = row.spend / avgSpendPerKeyword;

    // Add as exact: good ROAS but very low spend (low-hanging fruit)
    if (roas >= targetRoas * 0.8 && spendRatio < 0.3) {
      return "add_as_exact";
    }

    // Add as phrase: marginal ROAS, high spend (bidding up to profitability)
    if (roas >= targetRoas * 0.7 && roas < targetRoas && spendRatio >= 0.5) {
      return "add_as_phrase";
    }

    // Pause: poor ROAS, over budget
    if (roas < targetRoas && spendRatio > 0.8) {
      return "pause";
    }

    // Keep: default: healthy ROAS or reasonable spend
    return "keep";
  }

  private calcRoas(row: { spend: number; revenue: number }): number {
    if (row.spend <= 0) return 0;
    return row.revenue / row.spend;
  }

  private emptyResult(): StrTriageOutput {
    return {
      classifications: [],
      scoreDimensions: null,
      score: 100,
    };
  }
}
