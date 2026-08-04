/**
 * ListingAuditOutput: output types for the Listing Audit + Keyword Research simulator.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 * STORY-080: Listing Audit rubric rewrite. Replaces the character-count
 * title/bullet/description scores with a weighted-categorical rubric
 * across six dimensions. See docs/stories/STORY-080.md.
 *
 * STORY-083: replaces the binary fix/skip ground truth (a pure function of
 * severity -- "mark everything fix" passed at every difficulty) with a
 * 4-action, context-dependent model. `FindingAction` gains `defer` and
 * `escalate`; `GradedFinding` carries `expectedAction`/`acceptedActions`/
 * `rationale`/`evidenceRefs` instead of a bare `groundTruth`. The finding
 * generator (RULES, `evaluate()`) is untouched -- STORY-083 only replaces
 * how a finding's expected action is resolved, in
 * `ListingAuditSimulator.ts`'s `resolveExpectedAction()`.
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

/**
 * Student's triage decision for a finding. STORY-083 expands this from a
 * binary fix/skip set to four actions, matching how a real PPC/listing
 * reviewer actually triages an audit:
 *  - fixNow:   act on this immediately, no ambiguity
 *  - defer:    a real improvement, but not urgent -- schedule it, don't skip it
 *  - skip:     a genuine non-issue in this context (false positive, covered
 *              elsewhere, or not applicable) -- not the same as "ignore it"
 *  - escalate: compliance risk is plausible but not disproven by available
 *              evidence -- flag for human review rather than guessing
 */
export type FindingAction = "fixNow" | "defer" | "skip" | "escalate";

export interface GradedFinding extends AuditFinding {
  /**
   * The single best action for this finding given its context --
   * resolved by `resolveExpectedAction()`, not by severity alone.
   */
  readonly expectedAction: FindingAction;
  /**
   * Every action that counts as correct for this finding. Usually just
   * `[expectedAction]`, but a finding can have more than one legitimate
   * response (e.g. both `skip` and `defer` are defensible for a low-impact,
   * context-disproven warning).
   */
  readonly acceptedActions: readonly FindingAction[];
  /** Why this action (or set of actions) is correct -- shown to the student. */
  readonly rationale: string;
  /** `ListingScenarioContext` field paths that justified the resolution, e.g. `["structuredAttributes.dimensions"]`. */
  readonly evidenceRefs: readonly string[];
  /** Student's submitted action (undefined = not yet reviewed). */
  readonly userChoice?: FindingAction;
  /** Whether the student's choice is in `acceptedActions`. */
  readonly isCorrect: boolean;
}

/**
 * Additional per-listing context STORY-083's ground-truth resolver needs to
 * tell a genuine issue from a context-disproven false positive. All fields
 * beyond the ones ListingAuditInput already carried (marketplace, images,
 * hasAPlus) are new; all are optional with defaults so existing callers
 * that only audit title/bullets/description keep working, matching
 * STORY-080's precedent for `images`/`hasVideo`/`hasAPlus`.
 */
export interface ListingScenarioContext {
  readonly marketplace: string;
  readonly categoryId: string;
  readonly productType: string;
  /** e.g. `{ material: "bamboo", dimensions: "18 x 12 x 1 in" }` -- disproves missing-attribute findings. */
  readonly structuredAttributes: Readonly<Record<string, string>>;
  readonly variationTheme: string;
  /** What the shopper is actually trying to accomplish -- used to judge whether front-loaded/synonym coverage is sufficient. */
  readonly primaryCustomerIntent: string;
  readonly primaryKeywords: readonly string[];
  readonly listingStrategy: string;
  readonly currentPerformance: Readonly<Record<string, unknown>>;
  /**
   * Evidence that disproves or confirms a compliance-adjacent finding, e.g.
   * `{ "prohibited_superlative_claims": "BPA-free is a material fact, not a promotional claim" }`.
   * Keyed by ruleId. Presence of a key means the finding has documented
   * evidence; absence means the resolver has nothing to go on and must not
   * silently assume innocence.
   */
  readonly complianceEvidence: Readonly<Record<string, string>>;
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
