/**
 * StrTriageOutput — output types for the STR Triage simulator.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 *
 * When userClassifications are provided, the simulator evaluates each
 * keyword classification against ground truth and returns per-dimension
 * scores that feed into GradeSimulatorAttempt.
 *
 * Scoring dimensions:
 *  direction       — % of keywords correctly classified (user === groundTruth)
 *  profitability  — % of revenue preserved (kept/add keywords that weren't
 *                    pausable vs. total non-pausable revenue)
 *  dataSufficiency — % of rows the user assigned an action to
 *  explanation     — 100 (future: rubric-based on written justification)
 */

export type TriageAction = "keep" | "pause" | "add_as_exact" | "add_as_phrase";

export interface KeywordClassification {
  readonly keyword: string;
  /** Ground-truth correct action (simulator's classification) */
  readonly groundTruth: TriageAction;
  /** User's submitted action (undefined = not yet submitted) */
  readonly userChoice?: TriageAction;
  /** ROAS for this keyword */
  readonly roas: number;
  /** Total spend for this keyword */
  readonly spend: number;
  /** Whether the user's choice matched ground truth */
  readonly isCorrect: boolean;
}

export interface StrTriageOutput {
  readonly classifications: readonly KeywordClassification[];
  /**
   * Per-dimension scores (0–100) when userClassifications are provided.
   * Null when no user classifications are supplied (preview/ground-truth only).
   */
  readonly scoreDimensions: ScoreDimensions | null;
  /**
   * Legacy flat score — preserved for backward compatibility with existing
   * callers that don't yet use scoreDimensions.
   * = scoreDimensions?.direction ?? 100 when userClassifications provided,
   * = 100 otherwise (no grading, just ground truth).
   */
  readonly score: number;
}

/** Dimension scores fed into GradeSimulatorAttempt. */
export interface ScoreDimensions {
  /** % of keywords correctly classified (direction) */
  readonly direction: number;
  /** % of non-pausable revenue preserved by user's classification choices */
  readonly profitability: number;
  /** % of rows with a userChoice assigned */
  readonly dataSufficiency: number;
  /** Placeholder — future rubric-based scoring */
  readonly explanation: number;
}
