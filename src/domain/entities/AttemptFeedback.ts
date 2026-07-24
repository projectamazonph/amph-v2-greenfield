/**
 * AttemptFeedback — domain entity for simulator attempt feedback + remediation.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 *
 * A pure domain function that composes actionable feedback from a graded
 * SimulatorAttempt and its ScorePolicy. No side effects, no external calls.
 *
 * All data needed (score, scoreDimensions, decisions) is already in the
 * graded attempt. Remediation recommendations are static templates keyed
 * by verdict and dimension.
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  AttemptStatus,
  Difficulty,
  SimulatorAttempt,
  SimulatorMode,
  ScoreDimensions,
} from "@/domain/entities/SimulatorAttempt";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";
import { isPassed as policyIsPassed } from "@/domain/entities/ScorePolicy";

// ── Types ────────────────────────────────────────────────────────────────

export type FeedbackVerdict = "excellent" | "good" | "fair" | "poor";

export interface DimensionFeedback {
  readonly dimension: string;
  readonly verdict: FeedbackVerdict;
  readonly score: number;
  readonly comment: string;
  readonly recommendation: string;
}

export interface AttemptFeedback {
  readonly attemptId: string;
  readonly userId: string;
  readonly simulatorId: SimulatorId;
  readonly scenarioId: string;
  readonly difficulty: Difficulty;
  readonly mode: SimulatorMode;
  readonly overallScore: number;
  readonly passed: boolean;
  readonly overallComment: string;
  readonly remediationLinks: readonly string[];
  readonly dimensionFeedback: readonly DimensionFeedback[];
  readonly completedAt: Date;
}

export interface ComposeAttemptFeedbackParams {
  readonly attempt: Pick<
    SimulatorAttempt,
    | "id"
    | "userId"
    | "simulatorId"
    | "scenarioId"
    | "difficulty"
    | "mode"
    | "score"
    | "scoreDimensions"
    | "decisions"
  >;
  readonly policy: ScorePolicy;
}

// ── Verdict helpers ──────────────────────────────────────────────────────

function getVerdict(score: number): FeedbackVerdict {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

// ── Comment + recommendation templates ─────────────────────────────────

const DIMENSION_COMMENTS: Record<string, Record<FeedbackVerdict, string>> = {
  direction: {
    excellent: "Outstanding. You correctly identified the optimal bid direction and timing.",
    good: "Solid direction. Your strategy was mostly aligned with the campaign objective.",
    fair: "Your bid direction was partially correct. Review the campaign goal and align your bid adjustments accordingly.",
    poor: "The bid direction needs significant work. Revisit the fundamentals of PPC bid strategy and how direction maps to campaign goals.",
  },
  magnitude: {
    excellent: "Excellent bid magnitude. Your adjustments were precisely calibrated to the data.",
    good: "Good magnitude decisions. Your bids were reasonable given the performance data.",
    fair: "Your bid magnitudes were somewhat off. Consider whether you are responding appropriately to ACOS and CTR signals.",
    poor: "Bid magnitudes need significant adjustment. Review how bid changes propagate through the campaign structure.",
  },
  dataSufficiency: {
    excellent: "You used all relevant data points and drew sound conclusions.",
    good: "You considered the key data adequately before making your decision.",
    fair: "Review more data before deciding. Certain metrics were overlooked.",
    poor: "More analysis is needed. Ensure you are looking at the full picture before adjusting bids.",
  },
  profitability: {
    excellent: "Excellent profitability analysis. Your decisions optimized for the right metric.",
    good: "Good profitability judgment. Your approach balanced revenue and cost appropriately.",
    fair: "Your profitability assessment was incomplete. Double-check your ACOS and margin calculations.",
    poor: "Profitability considerations were missing or incorrect. Review how to evaluate PPC profitability.",
  },
  explanation: {
    excellent: "Clear, data-backed reasoning that demonstrates strong analytical thinking.",
    good: "Adequate explanation showing sound understanding of the decision rationale.",
    fair: "The reasoning needs more structure. Walk through your data, your interpretation, and your conclusion.",
    poor: "An explanation is required. Always document why you made each decision.",
  },
};

const DIMENSION_RECOMMENDATIONS: Record<string, Record<FeedbackVerdict, string>> = {
  direction: {
    excellent: "Try a more complex scenario to push your strategic thinking further.",
    good: "Practice identifying signals earlier to improve your directional decision speed.",
    fair: "Review the campaign objective summary and map each bid change back to the goal.",
    poor: "Start with the Bid Elevator beginner scenarios to build directional intuition.",
  },
  magnitude: {
    excellent: "Move to challenge mode to test your calibration under tighter constraints.",
    good: "Practice with tighter budgets to sharpen your magnitude judgment.",
    fair: "Track your bid changes and their outcomes to build magnitude intuition.",
    poor: "Practice with smaller adjustments first. Aim for 10-20% changes before scaling up.",
  },
  dataSufficiency: {
    excellent: "Explore the campaign with additional data filters to find edge-case patterns.",
    good: "Try scenarios with noisier data to strengthen your signal-to-noise judgment.",
    fair: "Create a pre-flight checklist: ACOS, CTR, CPC, impressions, spend — review all five.",
    poor: "Always check at least ACOS, CTR, and impressions before making a bid decision.",
  },
  profitability: {
    excellent: "Test scenarios with negative margin products to push your profitability analysis.",
    good: "Try products at different margin tiers to calibrate your profitability thresholds.",
    fair: "Calculate target ACOS from your product margin before each scenario.",
    poor: "Review the relationship between ACOS, product margin, and average order value.",
  },
  explanation: {
    excellent:
      "Practice explaining your reasoning to someone unfamiliar with PPC to sharpen clarity.",
    good: "Work on being more concise while covering all key data points.",
    fair: "Structure your explanations as: Data Observed -> Interpretation -> Decision.",
    poor: "For each bid decision, write down what you saw, what you concluded, and what you did.",
  },
};

const OVERALL_PASS_COMMENT = {
  "bid-elevator":
    "Impressive work. Your bid strategy shows a strong grasp of PPC fundamentals. Ready for more advanced scenarios.",
  "str-triage":
    "Excellent prioritization. Your triage decisions demonstrate solid campaign management instincts.",
  "campaign-builder":
    "Well-structured campaign build. Your keyword and match-type selections show good strategic thinking.",
  "listing-audit":
    "Sharp audit skills. Your identification of listing issues and opportunities is spot-on.",
};

const OVERALL_FAIL_COMMENT = {
  "bid-elevator":
    "Good effort. Review the bid fundamentals and try again. Focus on the dimensions marked fair or poor.",
  "str-triage":
    "Review the triage priorities and try again. Consistent prioritization improves with practice.",
  "campaign-builder":
    "Review the campaign-building principles and refine your structure. Each revision builds intuition.",
  "listing-audit":
    "Audit skills improve with practice. Review the key listing factors and try again with a sharper eye.",
};

const REMEDIATION_LINKS: Record<FeedbackVerdict, readonly string[]> = {
  excellent: [],
  good: [],
  fair: ["/courses", "/dashboard"],
  poor: ["/courses", "/dashboard", "/tools"],
};

const PASSING_REMEDIATION_LINKS: readonly string[] = ["/courses", "/dashboard"];

// ── Factory ─────────────────────────────────────────────────────────────

/**
 * Compose actionable feedback for a graded SimulatorAttempt.
 *
 * Pure function - no side effects.
 *
 * @param params.attempt - graded SimulatorAttempt (must have score, scoreDimensions, status === "graded")
 * @param params.policy - ScorePolicy used to grade this attempt
 */
export function composeAttemptFeedback(params: ComposeAttemptFeedbackParams): AttemptFeedback {
  const { attempt, policy } = params;

  // The caller (use case) is responsible for ensuring status === "graded"
  const score = attempt.score ?? 0;
  const scoreDimensions: ScoreDimensions = attempt.scoreDimensions ?? {};
  const passed = policyIsPassed(score, policy);

  // Per-dimension feedback
  const dimensionFeedback: DimensionFeedback[] = [];
  for (const [dimension, rawScore] of Object.entries(scoreDimensions)) {
    if (rawScore === undefined) continue;
    const verdict = getVerdict(rawScore);

    const comments = DIMENSION_COMMENTS[dimension];
    const recommendations = DIMENSION_RECOMMENDATIONS[dimension];

    dimensionFeedback.push({
      dimension,
      verdict,
      score: rawScore,
      comment: comments?.[verdict] ?? `Score of ${rawScore} on ${dimension}.`,
      recommendation:
        recommendations?.[verdict] ??
        `Review your approach to ${dimension} and practice with simpler scenarios.`,
    });
  }

  // Overall comment
  const simulatorComments = passed ? OVERALL_PASS_COMMENT : OVERALL_FAIL_COMMENT;
  const overallComment =
    simulatorComments[attempt.simulatorId as SimulatorId] ??
    (passed
      ? "Great work! Review your feedback and try the next scenario."
      : "Review the feedback below and try again. Consistent practice builds mastery.");

  // Remediation links: show links when passed (encourage next step) or when
  // there are poor dimensions (point to learning resources)
  const weakestVerdict = dimensionFeedback.reduce<FeedbackVerdict>((worst, dim) => {
    const order: FeedbackVerdict[] = ["excellent", "good", "fair", "poor"];
    return order.indexOf(dim.verdict) > order.indexOf(worst) ? dim.verdict : worst;
  }, "excellent");

  const remediationLinks = passed
    ? PASSING_REMEDIATION_LINKS
    : weakestVerdict === "poor"
      ? (REMEDIATION_LINKS[weakestVerdict] ?? [])
      : [];

  return {
    attemptId: attempt.id,
    userId: attempt.userId,
    simulatorId: attempt.simulatorId as SimulatorId,
    scenarioId: attempt.scenarioId,
    difficulty: attempt.difficulty,
    mode: attempt.mode,
    overallScore: score,
    passed,
    overallComment,
    remediationLinks,
    dimensionFeedback,
    completedAt: new Date(),
  };
}

// ── Hydration (repository adapter only) ─────────────────────────────────

/**
 * Rehydrate an AttemptFeedback from persisted plain data.
 * Repository adapters only — skips factory validation.
 */
export function hydrateAttemptFeedback(
  plain: Omit<AttemptFeedback, "completedAt"> & {
    completedAt: Date;
  },
): AttemptFeedback {
  return { ...plain };
}
