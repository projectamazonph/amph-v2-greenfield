/**
 * ConnectedAccountInput — input types for the Connected-Account Simulator.
 *
 * STORY-089. The simulator mirrors a (mock) Amazon Advertising API: a
 * scenario publishes a snapshot of campaigns with per-keyword economics
 * and a recent Search Term Report, and the student responds with bids
 * and triage decisions. No real Amazon account is ever touched — the
 * scenario is the only source of truth for what the student sees, so
 * there is nothing to forge and nothing to leak.
 *
 * The shape intentionally mirrors `BidElevatorInput` and `StrTriageInput`
 * (keyword + per-keyword bid, search-term row + classification) so a
 * future migration to a single Amazon-API-shape input is a refactor,
 * not a new simulator. `gradeAttempt()` below turns the user's
 * adjustments into the same scoring dimensions a real Amazon API would
 * surface: bid accuracy vs target ACoS, and STR triage accuracy vs
 * ground-truth winner/bleeder labels.
 *
 * No constructor dependencies. No IO. Pure function like every sibling
 * simulator. The app-layer server action resolves the published
 * SimulatorScenario and turns its `inputSchema` JSON into the
 * `scenario` value below; the simulator itself never reads the
 * scenario repo.
 */

/** A single keyword row in the mock campaign snapshot. */
export interface ConnectedAccountKeyword {
  /** Stable id used to key the user's bid adjustment. */
  readonly keywordId: string;
  /** Human-readable search term shown in the mock API response. */
  readonly keyword: string;
  /** Match type used by the campaign. */
  readonly matchType: "exact" | "phrase" | "broad";
  /** Mock-API-reported 30-day impressions. */
  readonly impressions: number;
  /** Mock-API-reported 30-day clicks. */
  readonly clicks: number;
  /** Mock-API-reported 30-day spend in PHP minor (₱1 = 100). */
  readonly spendMinor: number;
  /** Mock-API-reported 30-day sales in PHP minor. */
  readonly salesMinor: number;
  /** Current bid set on the campaign, PHP minor. */
  readonly currentBidMinor: number;
}

/** A single search-term row in the mock STR snapshot. */
export interface ConnectedAccountSearchTerm {
  /** Stable id used to key the user's triage decision. */
  readonly termId: string;
  /** Search term the customer used. */
  readonly term: string;
  /** Mock-API-reported 30-day clicks. */
  readonly clicks: number;
  /** Mock-API-reported 30-day spend in PHP minor. */
  readonly spendMinor: number;
  /** Mock-API-reported 30-day sales in PHP minor. */
  readonly salesMinor: number;
  /** Mock-API-reported 30-day orders. */
  readonly orders: number;
}

/**
 * The published scenario's `inputSchema` JSON, parsed and validated by
 * the app-layer server action before being passed to `run()`.
 */
export interface ConnectedAccountScenario {
  readonly campaignName: string;
  /** ISO 4217 currency code, e.g. "PHP". */
  readonly currencyCode: string;
  /** Daily budget in PHP minor. */
  readonly dailyBudgetMinor: number;
  /** Target ACoS percent (0-100). */
  readonly targetAcosPct: number;
  /** Break-even ACoS percent (0-100). */
  readonly breakEvenAcosPct: number;
  /** Average revenue per order in PHP minor. */
  readonly revenuePerOrderMinor: number;
  readonly keywords: readonly ConnectedAccountKeyword[];
  readonly searchTerms: readonly ConnectedAccountSearchTerm[];
}

/** The student's bid adjustment for one keyword, in PHP minor. */
export interface ConnectedAccountBidDecision {
  /** Required. Must match a keywordId in the scenario. */
  readonly keywordId: string;
  /** Required. The new bid in PHP minor. Must be >= 0. */
  readonly newBidMinor: number;
}

/** The student's triage classification for one search term. */
export type ConnectedAccountTriageAction =
  "keep" | "optimize" | "pause" | "negate_exact" | "negate_phrase";

export interface ConnectedAccountTriageDecision {
  /** Required. Must match a termId in the scenario. */
  readonly termId: string;
  /** Required. One of the five triage actions. */
  readonly action: ConnectedAccountTriageAction;
}

export interface ConnectedAccountInput {
  /** Resolved by the app-layer action from the published SimulatorScenario. */
  readonly scenario: ConnectedAccountScenario;
  /**
   * Student's bid adjustments, keyed by keywordId. Undefined = preview /
   * ground-truth-only run (no grading).
   */
  readonly bidDecisions?: readonly ConnectedAccountBidDecision[];
  /**
   * Student's triage decisions, keyed by termId. Undefined = preview /
   * ground-truth-only run (no grading).
   */
  readonly triageDecisions?: readonly ConnectedAccountTriageDecision[];
}
