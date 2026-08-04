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
 * STORY-085: the legacy `runBidElevator()` wrapper is removed — it was the
 * only thing BidElevatorForm actually called, so bid-elevator never
 * created a persisted, gradable SimulatorAttempt in production despite
 * bidElevatorAttempt() existing since STORY-079. The form now calls
 * bidElevatorAttempt() directly. It also used to echo the full scenario
 * (9 economics scalars + all 8 keywords' CTR/CVR/elasticity/etc.) back to
 * the server on every submit; a forged payload could directly control the
 * grade. `bidElevatorAttempt()` now resolves the *currently published*
 * bid-elevator scenario server-side and uses its content; only
 * `userBidAdjustments` (the student's bids) and `mode` are trusted from
 * the client.
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { AppContainer } from "@/composition/container";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { BidElevatorInput } from "@/domain/simulator/bid-elevator/BidElevatorInput";
import type {
  BidElevatorOutput,
  BidRecommendation,
  ScoreDimensions,
} from "@/domain/simulator/bid-elevator/BidElevatorOutput";
import type { FeedbackVerdict } from "@/domain/entities/AttemptFeedback";
import { bidElevatorScenarioContentSchema } from "./scenarioContent";

async function resolvePublishedScenario(container: AppContainer) {
  const result = await container.scenarioRepo.findPublished("bid-elevator");
  if (!result.ok || !result.value) {
    return null;
  }
  const parsed = bidElevatorScenarioContentSchema.safeParse(result.value.inputSchema);
  if (!parsed.success) {
    return null;
  }
  return { scenarioId: result.value.id, content: parsed.data };
}

// ── bidElevatorAttempt: full graded lifecycle (authenticated) ─────────

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

const bidElevatorAttemptSchema = z.object({
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

  const { mode, userBidAdjustments } = parseResult.data;
  const resolvedMode: SimulatorMode = mode ?? "practice";
  const container = buildContainer();

  // ── 2. Authenticate ─────────────────────────────────────────────────
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // ── 3. Resolve the published scenario server-side ───────────────────
  const scenario = await resolvePublishedScenario(container);
  if (!scenario) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "No published bid-elevator scenario found" },
    };
  }

  // ── 4. StartSimulatorAttempt ────────────────────────────────────────
  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "bid-elevator",
    scenarioId: scenario.scenarioId,
    mode: resolvedMode,
  });

  if (Result.isErr(startResult)) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: startResult.error.kind },
    };
  }

  const attemptId = startResult.value.attemptId;

  // ── 5. Run simulator ───────────────────────────────────────────────
  const sim = container.simulatorRegistry.get("bid-elevator");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "bid-elevator simulator not registered" },
    };
  }

  const domainInput: BidElevatorInput = {
    ...scenario.content,
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

  // ── 6. GradeSimulatorAttempt ────────────────────────────────────────
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

  // ── 7. ComposeAttemptFeedback ───────────────────────────────────────
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

  // ── 8. Return results ────────────────────────────────────────────────
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
