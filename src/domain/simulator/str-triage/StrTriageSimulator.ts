/**
 * StrTriageSimulator — categorizes Amazon PPC keyword data into action buckets.
 *
 * STORY-038: STR Triage simulator.
 *
 * Classification rules (checked in priority order):
 *  add_as_exact — ROAS >= targetRoas × 0.8 but spend ratio < 0.3 (low-hanging fruit)
 *  add_as_phrase — ROAS >= targetRoas × 0.7 but < targetRoas, spend ratio >= 0.5 (marginal)
 *  pause        — ROAS < targetRoas AND spend ratio > 0.8 (over-spending bad keywords)
 *  keep         — default: healthy ROAS with reasonable spend
 *
 * The simulator provides ground-truth classifications. User categorization against
 * these is future scope.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { StrTriageInput } from "./StrTriageInput";
import type { StrTriageOutput, KeywordClassification, TriageAction } from "./StrTriageOutput";

export class StrTriageSimulator implements Simulator<StrTriageInput, StrTriageOutput> {
  readonly simulatorId = "str-triage" as const;
  readonly name = "STR Triage";

  async run(input: StrTriageInput): Promise<StrTriageOutput> {
    const { rows, targetRoas } = input;

    if (rows.length === 0) {
      return { classifications: [], score: 100 };
    }

    const classifications: KeywordClassification[] = rows.map((row) => ({
      keyword: row.keyword,
      action: this.classify(row, targetRoas),
      roas: this.calcRoas(row),
      spend: row.spend,
    }));

    return {
      classifications,
      score: 100,
    };
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

    // Keep: default — healthy ROAS or reasonable spend
    return "keep";
  }

  private calcRoas(row: { spend: number; revenue: number }): number {
    if (row.spend <= 0) return 0;
    return row.revenue / row.spend;
  }
}
