/**
 * StrTriageInput — input types for the STR Triage simulator.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 */

import type { TriageAction } from "./StrTriageOutput";

export interface KeywordPerfRow {
  readonly keyword: string;
  readonly spend: number; // total ad spend in USD
  readonly revenue: number; // attributed revenue in USD
  readonly orders: number; // attributed orders
}

export interface StrTriageInput {
  readonly rows: readonly KeywordPerfRow[];
  /** Target ROAS for classification (e.g. 3.0 = 3× ROAS target) */
  readonly targetRoas: number;
  /**
   * User's submitted classifications — keyed by keyword.
   * When provided, the simulator computes per-dimension scores.
   * When absent, returns ground truth only (preview mode).
   */
  readonly userClassifications?: Readonly<Record<string, TriageAction>>;
}
