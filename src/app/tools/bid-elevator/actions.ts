/**
 * bid-elevator/actions.ts — server actions for the Bid Elevator simulator.
 *
 * STORY-079: Bid Elevator economic model rewrite.
 *
 * `bidElevatorAttempt()` follows the full attempt lifecycle:
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. BidElevatorSimulator.run() — computes dimension scores from user bid adjustments
 *   3. GradeSimulatorAttempt — persists the grade with score dimensions
 *   4. ComposeAttemptFeedback — generates actionable student feedback
 * It requires an authenticated session.
 *
 * `runBidElevator()` is the legacy, unauthenticated, preview-only entry
 * point the public practice page still uses: it calls the simulator
 * directly with no user adjustments, so scoreDimensions is always null.
 * Kept ungated so the practice tool stays reachable without a login.
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type {
  BidElevatorInput,
  BidElevatorKeywordScenario,
} from "@/domain/simulator/bid-elevator/BidElevatorInput";
import type {
  BidElevatorOutput,
  BidRecommendation,
  ScoreDimensions,
} from "@/domain/simulator/bid-elevator/BidElevatorOutput";
import type { FeedbackVerdict } from "@/domain/entities/AttemptFeedback";

// ── Zod schema (shared) ────────────────────────────────────────────────

const keywordScenarioSchema = z.object({
  keywordId: z.string().min(1),
  keyword: z.string().min(1),
  matchType: z.enum(["exact", "phrase", "broad"]),
  intent: z.enum(["branded", "generic", "competitor", "category"]),
  strategicRole: z.enum(["defense", "research", "performance"]),
  currentBid: z.number().nonnegative(),
  baselineBid: z.number().nonnegative(),
  baselineCtrPct: z.number().nonnegative(),
  baselineCvrPct: z.number().nonnegative(),
  revenuePerOrder: z.number().positive().optional(),
  benchmarkCpc: z.number().nonnegative(),
  availableImpressionsPerDay: z.number().nonnegative(),
  maxImpressionSharePct: z.number().min(0).max(100),
  bidElasticity: z.number().positive(),
  evidenceClicks: z.number().nonnegative(),
  evidenceOrders: z.number().nonnegative(),
  evidenceWindowDays: z.number().nonnegative(),
});

const scenarioSchema = z.object({
  currencyCode: z.string().min(1),
  dailyBudget: z.number().positive(),
  simulationDays: z.number().positive(),
  targetRoas: z.number().positive(),
  breakEvenAcosPct: z.number().positive(),
  defaultRevenuePerOrder: z.number().positive(),
  minimumBidIncrement: z.number().positive(),
  maxBidChangePct: z.number().positive().optional(),
  keywords: z.array(keywordScenarioSchema).min(1),
});

// ── bidElevatorAttempt: full graded lifecycle (authenticated) ─────────

export interface BidElevatorAttemptInput {
  readonly currencyCode: string;
  readonly dailyBudget: number;
  readonly simulationDays: number;
  readonly targetRoas: number;
  readonly breakEvenAcosPct: number;
  readonly defaultRevenuePerOrder: number;
  readonly minimumBidIncrement: number;
  readonly maxBidChangePct?: number;
  readonly keywords: readonly BidElevatorKeywordScenario[];
  readonly scenarioId?: string;
  /** Defaults to "practice" */
  readonly mode?: SimulatorMode;
  /** Student-submitted bid adjustments, keyed by keywordId */
  readonly userBidAdjustments?: Readonly<Record<string, number>>;
}

export interface BidElevatorAttemptResult {
  readonly attemptId: string;
  readonly overallScore: number;
  readonly scoreDimensions: ScoreDimensions | null;
  readonly isPassed: boolean;
  readonly bids: readonly BidRecommendation[];
  readonly estimatedSpend: number;
  readonly estimatedRoas: number;
  readonly feedback: {
    readonly passed: boolean;
    readonly overallScore: number;
    readonly overallComment: string;
    readonly remediationLinks: readonly string[];
    readonly dimensionFeedback: readonly {
      readonly dimension: string;
      readonly verdict: FeedbackVerdict;
      readonly comment: string;
    }[];
  } | null;
}

export type BidElevatorAttemptResponse =
  | { ok: true; value: BidElevatorAttemptResult }
  | { ok: false; error: { kind: "unauthorized" } }
  | {
      ok: false;
      error: {
        kind: "validation_error" | "attempt_error" | "grading_error" | "feedback_error";
        message: string;
      };
    };

const bidElevatorAttemptSchema = scenarioSchema.extend({
  scenarioId: z.string().optional(),
  mode: z.enum(["guided", "practice", "challenge", "credential", "instructor"]).optional(),
  userBidAdjustments: z.record(z.string(), z.number().nonnegative()).optional(),
});

export async function bidElevatorAttempt(input: unknown): Promise<BidElevatorAttemptResponse> {
  // ── 1. Validate ────────────────────────────────────────────────────
  const parseResult = bidElevatorAttemptSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        kind: "validation_error",
        message: parseResult.error.issues.map((i) => i.message).join("; "),
      },
    };
  }

  const { scenarioId, mode, userBidAdjustments, ...scenario } = parseResult.data;
  const resolvedMode: SimulatorMode = mode ?? "practice";
  const container = buildContainer();

  // ── 2. Authenticate ─────────────────────────────────────────────────
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // ── 3. StartSimulatorAttempt ────────────────────────────────────────
  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "bid-elevator",
    scenarioId: scenarioId ?? "bid-elevator-scenario-default",
    mode: resolvedMode,
  });

  if (Result.isErr(startResult)) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: startResult.error.kind },
    };
  }

  const attemptId = startResult.value.attemptId;

  // ── 4. Run simulator ───────────────────────────────────────────────
  const sim = container.simulatorRegistry.get("bid-elevator");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "bid-elevator simulator not registered" },
    };
  }

  const domainInput: BidElevatorInput = {
    ...scenario,
    ...(userBidAdjustments !== undefined ? { userBidAdjustments } : {}),
  };

  let simOutput: BidElevatorOutput;
  try {
    simOutput = (await sim.run(domainInput)) as BidElevatorOutput;
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "attempt_error",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  // ── 5. GradeSimulatorAttempt ────────────────────────────────────────
  const scoreDimensions =
    simOutput.scoreDimensions !== null
      ? {
          bidAccuracy: simOutput.scoreDimensions.bidAccuracy,
          budgetAdherence: simOutput.scoreDimensions.budgetAdherence,
          roasHit: simOutput.scoreDimensions.roasHit,
        }
      : null;

  if (scoreDimensions !== null) {
    const gradeResult = await container.gradeSimulatorAttempt.execute({
      attemptId,
      scoreDimensions,
    });

    if (Result.isErr(gradeResult)) {
      return {
        ok: false,
        error: {
          kind: "grading_error",
          message:
            gradeResult.error.kind === "invalid_dimensions"
              ? `invalid dimensions: ${gradeResult.error.missing.join(", ")}`
              : gradeResult.error.kind,
        },
      };
    }
  }

  // ── 6. ComposeAttemptFeedback ───────────────────────────────────────
  let feedback: BidElevatorAttemptResult["feedback"] = null;

  if (scoreDimensions !== null) {
    const feedbackResult = await container.composeAttemptFeedback.execute({ attemptId });
    if (Result.isErr(feedbackResult)) {
      return {
        ok: false,
        error: { kind: "feedback_error", message: feedbackResult.error.kind },
      };
    }
    feedback = {
      passed: feedbackResult.value.feedback.passed,
      overallScore: feedbackResult.value.feedback.overallScore,
      overallComment: feedbackResult.value.feedback.overallComment,
      remediationLinks: feedbackResult.value.feedback.remediationLinks,
      dimensionFeedback: feedbackResult.value.feedback.dimensionFeedback.map((d) => ({
        dimension: d.dimension,
        verdict: d.verdict,
        comment: d.comment,
      })),
    };
  }

  // ── 7. Return results ────────────────────────────────────────────────
  const isPassed =
    scoreDimensions !== null
      ? (simOutput.scoreDimensions?.bidAccuracy ?? 0) >= 50 // rough pass threshold
      : false;

  return {
    ok: true,
    value: {
      attemptId,
      overallScore: simOutput.score,
      scoreDimensions: simOutput.scoreDimensions,
      isPassed,
      bids: simOutput.bids,
      estimatedSpend: simOutput.estimatedSpend,
      estimatedRoas: simOutput.estimatedRoas,
      feedback,
    },
  };
}

// ── runBidElevator: legacy, unauthenticated, preview-only ──────────────

export interface RunBidElevatorInput {
  readonly currencyCode: string;
  readonly dailyBudget: number;
  readonly simulationDays: number;
  readonly targetRoas: number;
  readonly breakEvenAcosPct: number;
  readonly defaultRevenuePerOrder: number;
  readonly minimumBidIncrement: number;
  readonly maxBidChangePct?: number;
  readonly keywords: readonly BidElevatorKeywordScenario[];
  /** Student-submitted bid adjustments, keyed by keywordId */
  readonly userBidAdjustments?: Readonly<Record<string, number>>;
}

export type RunBidElevatorResult =
  | { ok: true; value: BidElevatorOutput }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

const runBidElevatorSchema = scenarioSchema.extend({
  userBidAdjustments: z.record(z.string(), z.number().nonnegative()).optional(),
});

/**
 * Legacy server action — kept for backward compatibility and to keep the
 * public practice page unauthenticated. Calls the simulator directly; when
 * userBidAdjustments is provided it returns graded scoreDimensions, but no
 * attempt record is created (no persistence, no feedback).
 */
export async function runBidElevator(input: unknown): Promise<RunBidElevatorResult> {
  const parseResult = runBidElevatorSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        kind: "invalid_input",
        message: parseResult.error.issues.map((i) => i.message).join("; "),
      },
    };
  }

  const { userBidAdjustments, ...scenario } = parseResult.data;
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("bid-elevator");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "Bid Elevator simulator not registered" },
    };
  }

  const domainInput: BidElevatorInput = {
    ...scenario,
    ...(userBidAdjustments !== undefined ? { userBidAdjustments } : {}),
  };

  try {
    const output = (await sim.run(domainInput)) as BidElevatorOutput;
    return { ok: true, value: output };
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "engine_error",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
