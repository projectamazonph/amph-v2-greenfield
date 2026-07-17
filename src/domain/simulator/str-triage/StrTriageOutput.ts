/**
 * StrTriageOutput — output types for the STR Triage simulator.
 *
 * STORY-038: STR Triage simulator.
 */

export type TriageAction = "keep" | "pause" | "add_as_exact" | "add_as_phrase";

export interface KeywordClassification {
  readonly keyword: string;
  readonly action: TriageAction;
  readonly roas: number;
  readonly spend: number;
}

export interface StrTriageOutput {
  readonly classifications: readonly KeywordClassification[];
  /** Percentage of keywords correctly triaged (100 if no rows) */
  readonly score: number;
}
