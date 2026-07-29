/**
 * StrTriageOutput: output types for the STR Triage simulator.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 * STORY-082: Expand STR Triage classifier. TriageAction grows from 4 to 7
 * values -- INSUFFICIENT_DATA is a real fifth (well, seventh) action:
 * restraint is a valid decision when the evidence thresholds aren't met.
 * See docs/stories/STORY-082.md.
 *
 * Scoring dimensions (formulas unchanged by STORY-082, only which ground
 * truths count as "removal" grows to match the wider action set):
 *  direction     : % of terms correctly classified (user === groundTruth)
 *  profitability : % of revenue preserved on terms whose ground truth was
 *                  NOT a removal action (pause/negative_exact/
 *                  negative_phrase). Genuinely revenue-based.
 *  reviewCoverage: % of rows the user assigned an action to (completion,
 *                   reported but NOT graded)
 */

import type { BrandClass } from "./StrTriageInput";

export type TriageAction =
  | "harvest_exact"
  | "harvest_phrase"
  | "negative_exact"
  | "negative_phrase"
  | "keep"
  | "pause"
  | "insufficient_data";

export interface KeywordClassification {
  readonly searchTerm: string;
  /** Ground-truth correct action (simulator's classification) */
  readonly groundTruth: TriageAction;
  /** User's submitted action (undefined = not yet submitted) */
  readonly userChoice?: TriageAction;
  /** Whether the user's choice matched ground truth. */
  readonly isCorrect: boolean;
  /** ROAS for this search term (sales / spend). */
  readonly roas: number;
  readonly spend: number;
  readonly brandClass: BrandClass;
  /** Why the ground truth is what it is -- shown to the student as feedback. */
  readonly reasoning: string;
  /**
   * Set when there's a branded/non-branded lane issue independent of the
   * core action (e.g. a profitable own-brand term sitting in Research
   * instead of Defense). Null when there's no routing concern.
   */
  readonly routingNote: string | null;
}

export interface StrTriageOutput {
  readonly classifications: readonly KeywordClassification[];
  /**
   * Per-dimension scores (0–100) when userClassifications are provided.
   * Null when no user classifications are supplied (preview/ground-truth only).
   */
  readonly scoreDimensions: ScoreDimensions | null;
  /**
   * Legacy flat score: preserved for backward compatibility with existing
   * callers that don't yet use scoreDimensions.
   * = scoreDimensions?.direction ?? 100 when userClassifications provided,
   * = 100 otherwise (no grading, just ground truth).
   */
  readonly score: number;
}

/** Dimension scores fed into GradeSimulatorAttempt. */
export interface ScoreDimensions {
  /** % of terms correctly classified (direction) */
  readonly direction: number;
  /** % of non-removal-ground-truth revenue preserved by user's classification choices */
  readonly profitability: number;
  /**
   * % of rows with a userChoice assigned. Completion, not judgement:
   * reported for display only. It is NOT a graded dimension.
   */
  readonly reviewCoverage: number;
}
