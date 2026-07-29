/**
 * ListingAuditOutput: output types for the Listing Audit + Keyword Research simulator.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 * STORY-080: Listing Audit rubric rewrite. Replaces the character-count
 * title/bullet/description scores with a weighted-categorical rubric
 * across six dimensions. See docs/stories/STORY-080.md.
 *
 * The fix/skip ground-truth grading (groundTruthAction, direction,
 * priorityCoverage, reviewCoverage) is unchanged here -- STORY-083 owns
 * replacing that with a contextual, non-binary action model. This story
 * only replaces how findings are generated and how the listing is scored.
 */

export type RuleDimension =
  "compliance" | "relevance" | "accuracy" | "conversion" | "mobile" | "imagery";

/** A rule's evaluated outcome for one listing. notApplicable rules don't count toward their dimension's score. */
export type RuleOutcome = "pass" | "warning" | "fail" | "notApplicable";

export type FindingSeverity = "info" | "warning" | "critical";

/** The five launch category variants (docs/stories/STORY-080.md). */
export type CategoryVariant =
  "general_home" | "beauty" | "food_supplements" | "electronics" | "apparel";

export interface AuditFinding {
  readonly id: string;
  readonly ruleId: string;
  readonly dimension: RuleDimension;
  readonly severity: FindingSeverity;
  /** If true and this rule's outcome is "fail", the overall score is capped regardless of the weighted total. */
  readonly isCriticalGate: boolean;
  readonly message: string;
  readonly suggestion: string;
  /** Normalized category-variant id this finding's rule was evaluated under. */
  readonly category: CategoryVariant;
  /** Marketplace code, e.g. "US" -- the only marketplace with a verified title policy today. */
  readonly marketplace: string;
  readonly policyVersion: string;
  readonly effectiveDate: string;
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
  /** 0-100 score per dimension, weighted-categorical (see docs/stories/STORY-080.md). */
  readonly dimensionScores: Record<RuleDimension, number>;
  /** Weighted sum of dimensionScores, capped if a critical-gate rule failed. */
  readonly overallScore: number;
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
  /** Overall listing-quality score 0-100, mirrors audit.overallScore. */
  readonly score: number;
  /**
   * `audit.findings` paired 1:1 with ground-truth triage + the student's
   * submitted fix/skip decision. Always populated; `userChoice`/`isCorrect`
   * are only meaningful once `userFindingActions` is submitted.
   */
  readonly gradedFindings: readonly GradedFinding[];
  /**
   * Per-dimension scores (0-100) when userFindingActions are provided.
   * Null when no triage decisions are supplied (preview/ground-truth only).
   */
  readonly scoreDimensions: ScoreDimensions | null;
}

/** Dimension scores fed into GradeSimulatorAttempt. Unchanged by STORY-080. */
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
