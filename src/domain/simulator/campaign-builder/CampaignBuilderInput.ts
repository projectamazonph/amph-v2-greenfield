/**
 * CampaignBuilderInput — input types for the Campaign Builder simulator.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 * STORY-084: Campaign Builder strategic scoring. Adds the scenario context
 * the 4 new grading dimensions need — brand taxonomy (negative routing,
 * branded isolation), an ASIN (naming-convention grading), and budget
 * reconciliation parameters. All optional/defaulted, same treatment as
 * STORY-080/083's new context fields, so existing callers keep working.
 */

import type { CampaignStructure } from "./CampaignBuilderOutput";

export type TargetingStrategy = "auto" | "manual" | "hybrid";

export interface CampaignBuilderInput {
  readonly productCategory: string;
  readonly monthlyBudget: number;
  readonly targetingStrategy: TargetingStrategy;
  readonly productNiche: string;
  /**
   * Optional student-submitted campaign structure. When provided, the simulator
   * grades the student's work against the ground-truth structure it generates,
   * computing per-dimension scores.
   */
  readonly userAdjustedCampaigns?: ReadonlyArray<CampaignStructure>;

  // ── STORY-084: brand taxonomy (negative routing + branded isolation) ────
  readonly brandName?: string;
  readonly brandAliases?: readonly string[];
  readonly brandMisspellings?: readonly string[];
  readonly brandProductNames?: readonly string[];
  readonly competitorBrands?: readonly string[];

  // ── STORY-084: naming convention ─────────────────────────────────────────
  readonly asin?: string;

  // ── STORY-084: budget reconciliation ─────────────────────────────────────
  /** Defaults to 30. */
  readonly planningPeriodDays?: number;
  /** Defaults to no cap (Infinity) when unset — a scenario-specific ceiling on total daily spend. */
  readonly accountDailyBudgetCap?: number;
}
