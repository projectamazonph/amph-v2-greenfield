/**
 * StrTriageInput — input types for the STR Triage simulator.
 *
 * STORY-038: STR Triage simulator.
 */

export interface KeywordPerfRow {
  readonly keyword: string;
  readonly spend: number; // total ad spend in USD
  readonly revenue: number; // attributed revenue in USD
  readonly orders: number; // attributed orders
}

export interface StrTriageInput {
  readonly rows: readonly KeywordPerfRow[];
  readonly targetRoas: number; // e.g. 3.0 = 3x ROAS target
}
