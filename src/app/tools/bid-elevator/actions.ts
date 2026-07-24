/**
 * bid-elevator/actions.ts — server actions for the Bid Elevator simulator.
 *
 * STORY-068: Bid Elevator Rebuild (Scoring Engine Integration).
 *
 * `bidElevatorAttempt()` follows the full attempt lifecycle:
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. BidElevatorSimulator.run() — computes dimension scores from user bid adjustments
 *   3. GradeSimulatorAttempt — persists the grade with score dimensions
 *   4. ComposeAttemptFeedback — generates actionable student feedback
 *
 * Legacy `runBidElevator()` is kept for backward compatibility. It calls the
 * simulator directly with no user adjustments, so scoreDimensions is always null.
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { getContainer } from "@/composition/container";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { BidElevatorInput } from "@/domain/simulator/bid-elevator/BidElevatorInput";
import type {
  BidElevatorOutput,
  BidRecommendation,
  ScoreDimensions,
} from "@/domain/simulator/bid-elevator/BidElevatorOutput";
import type { FeedbackVerdict } from "@/domain/entities/AttemptFeedback";

// ── Input types ─────────────────────────────────────────────────────────

export interface BidElevatorAttemptInput {
  readonly keywords: ReadonlyArray<{
    readonly keyword: string;
    readonly currentBid: number;
    readonly currentCpc: number;
    readonly volume: number;
  }>;
  readonly budget: number;
  readonly targetRoas: number;
  readonly scenarioId?: string;
  /** Defaults to "practice" */
  readonly mode?: SimulatorMode;
  /** User-submitted bid adjustments (keyword → bid amount) */
  readonly userBidAdjustments?: Readonly<Record<string, number>>;
}

// ── Response types ─────────────────────────────────────────────────────

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
  | {
      ok: false;
      error: {
        kind: "validation_error" | "attempt_error" | "grading_error" | "feedback_error";
        message: string;
      };
    };

// ── Zod schema ─────────────────────────────────────────────────────────

const keywordSchema = z.object({
  keyword: z.string().min(1),
  currentBid: z.number().nonnegative(),
  currentCpc: z.number().nonnegative(),
  volume: z.number().nonnegative(),
});

const bidElevatorAttemptSchema = z.object({
  keywords: z.array(keywordSchema).min(1),
  budget: z.number().positive(),
  targetRoas: z.number().positive(),
  scenarioId: z.string().optional(),
  mode: z.enum(["guided", "practice", "challenge", "credential", "instructor"]).optional(),
  userBidAdjustments: z.record(z.string(), z.number().nonnegative()).optional(),
});

// ── bidElevatorAttempt ─────────────────────────────────────────────────

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

  const { keywords, budget, targetRoas, scenarioId, mode, userBidAdjustments } = parseResult.data;
  const resolvedMode: SimulatorMode = mode ?? "practice";
  const container = getContainer();

  // ── 2. StartSimulatorAttempt ────────────────────────────────────────
  const startResult = await container.startSimulatorAttempt.execute({
    userId: "system", // TODO: get from session (STORY-068 follow-up)
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

  // ── 3. Run simulator ───────────────────────────────────────────────
  const sim = container.simulatorRegistry.get("bid-elevator");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "bid-elevator simulator not registered" },
    };
  }

  const domainInput: BidElevatorInput = {
    keywords,
    budget,
    targetRoas,
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

  // ── 4. GradeSimulatorAttempt ────────────────────────────────────────
  const scoreDimensions =
    simOutput.scoreDimensions !== null
      ? {
          bidAccuracy: simOutput.scoreDimensions.bidAccuracy,
          budgetAdherence: simOutput.scoreDimensions.budgetAdherence,
          roasHit: simOutput.scoreDimensions.roasHit,
          explanation: simOutput.scoreDimensions.explanation,
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

  // ── 5. ComposeAttemptFeedback ───────────────────────────────────────
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

  // ── 6. Return results ────────────────────────────────────────────────
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

// ── Legacy: runBidElevator ──────────────────────────────────────────────

export type RunBidElevatorInput = {
  keywords: ReadonlyArray<{
    keyword: string;
    currentBid: number;
    currentCpc: number;
    volume: number;
  }>;
  budget: number;
  targetRoas: number;
};

export type RunBidElevatorResult =
  | { ok: true; value: BidElevatorOutput }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

/**
 * Legacy server action — kept for backward compatibility.
 * Calls the simulator directly with no user adjustments, so scoreDimensions
 * is always null and score is computed from the ROAS formula (existing behavior).
 */
export async function runBidElevator(input: RunBidElevatorInput): Promise<RunBidElevatorResult> {
  if (
    !input ||
    !Array.isArray(input.keywords) ||
    input.keywords.length === 0 ||
    typeof input.budget !== "number" ||
    input.budget <= 0 ||
    typeof input.targetRoas !== "number" ||
    input.targetRoas <= 0
  ) {
    return {
      ok: false,
      error: { kind: "invalid_input", message: "Need ≥1 keyword, budget > 0, target ROAS > 0" },
    };
  }
  for (const k of input.keywords) {
    if (
      typeof k.keyword !== "string" ||
      typeof k.currentBid !== "number" ||
      k.currentBid < 0 ||
      typeof k.currentCpc !== "number" ||
      k.currentCpc < 0 ||
      typeof k.volume !== "number" ||
      k.volume < 0
    ) {
      return {
        ok: false,
        error: { kind: "invalid_input", message: `Bad keyword: ${JSON.stringify(k)}` },
      };
    }
  }

  const container = getContainer();
  const sim = container.simulatorRegistry.get("bid-elevator");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "Bid Elevator simulator not registered" },
    };
  }

  const domainInput: BidElevatorInput = {
    keywords: input.keywords as readonly KeywordBid[],
    budget: input.budget,
    targetRoas: input.targetRoas,
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

// re-export for consumers
type KeywordBid = import("@/domain/simulator/bid-elevator/BidElevatorInput").KeywordBid;
