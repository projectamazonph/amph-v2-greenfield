/**
 * ListingAuditOutput: output types for the Listing Audit + Keyword Research simulator.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 *
 * When userFindingActions are provided, the simulator grades the student's
 * fix/skip triage of each finding against ground truth and returns
 * per-dimension scores that feed into GradeSimulatorAttempt.
 *
 * Scoring dimensions:
 *  direction       : % of findings correctly triaged (fix/skip matches ground truth)
 *  priorityCoverage: severity-weighted F1 of the student's fix decisions
 *  reviewCoverage  : % of findings assigned a decision (reported, NOT graded)
 *
 * Sprint 14 removed `explanation` (a hardcoded 100 that policies weighted
 * 10-25%) and stopped grading `reviewCoverage` (completion, not judgement).
 * See docs/audit-2026-07-26-simulator-accuracy-review.md.
 */

export type AuditCategory = "title" | "bullets" | "description" | "backend";
export type FindingSeverity = "info" | "warning" | "critical";

export interface AuditFinding {
  readonly id: string;
  readonly category: AuditCategory;
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly suggestion: string;
}

/** Student's triage decision for a finding: fix it now, or skip it. */
export type FindingAction = "fix" | "skip";

export interface GradedFinding extends AuditFinding {
  /** Ground-truth correct action: "fix" for warning/critical, "skip" for info. */
  readonly groundTruth: FindingAction;
  /** Student's submitted action (undefined = not yet reviewed). */
  readonly userChoice?: FindingAction;
  /** Whether the student's choice matched ground truth. */
  readonly isCorrect: boolean;
}

export interface ListingAudit {
  readonly titleScore: number; // 0–100
  readonly bulletScore: number; // 0–100
  readonly descriptionScore: number; // 0–100
  readonly overallScore: number; // 0–100
  readonly findings: readonly AuditFinding[];
}

export interface KeywordResult {
  readonly keyword: string;
  readonly searchVolumeEstimate: number; // monthly search volume proxy
  readonly competition: "low" | "medium" | "high";
  readonly priority: "high" | "medium" | "low";
}

export interface KeywordResearchResult {
  readonly keywords: readonly KeywordResult[];
  readonly searchVolumeEstimate: number;
}

export interface ListingAuditOutput {
  readonly audit: ListingAudit;
  readonly keywordResearch: KeywordResearchResult;
  /** Overall listing-quality score 0–100 (title/bullets/description average). */
  readonly score: number;
  /**
   * `audit.findings` paired 1:1 with ground-truth triage + the student's
   * submitted fix/skip decision. Always populated; `userChoice`/`isCorrect`
   * are only meaningful once `userFindingActions` is submitted.
   */
  readonly gradedFindings: readonly GradedFinding[];
  /**
   * Per-dimension scores (0–100) when userFindingActions are provided.
   * Null when no triage decisions are supplied (preview/ground-truth only).
   */
  readonly scoreDimensions: ScoreDimensions | null;
}

/** Dimension scores fed into GradeSimulatorAttempt. */
export interface ScoreDimensions {
  /** % of findings correctly triaged (fix/skip matches ground truth) */
  readonly direction: number;
  /**
   * Severity-weighted F1 of the student's `fix` decisions: rewards fixing
   * what needed fixing AND not fixing what did not. Was `profitability`,
   * renamed because nothing here models revenue. STORY-073, STORY-076.
   */
  readonly priorityCoverage: number;
  /**
   * % of findings with a userChoice assigned. Completion, not judgement:
   * reported for display only. It is NOT a graded
   * dimension. Was `dataSufficiency`. STORY-072, STORY-076.
   */
  readonly reviewCoverage: number;
}
