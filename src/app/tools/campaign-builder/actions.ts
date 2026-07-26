/**
 * campaign-builder/actions.ts — server actions for the Campaign Builder simulator.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 *
 * `campaignBuilderAttempt()` follows the full attempt lifecycle:
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. CampaignBuilderSimulator.run() — computes dimension scores from user-adjusted campaigns
 *   3. GradeSimulatorAttempt — persists the grade with score dimensions
 *   4. ComposeAttemptFeedback — generates actionable student feedback
 *
 * Legacy `buildCampaign()` is kept for backward compatibility. It calls the
 * simulator directly with no user adjustments, so scoreDimensions is always null.
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { getContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type {
  CampaignBuilderInput,
  TargetingStrategy,
} from "@/domain/simulator/campaign-builder/CampaignBuilderInput";
import type {
  CampaignBuilderOutput,
  CampaignStructure,
  ScoreDimensions,
} from "@/domain/simulator/campaign-builder/CampaignBuilderOutput";

// ── Input types ─────────────────────────────────────────────────────────

export interface CampaignBuilderAttemptInput {
  readonly productCategory: string;
  readonly productNiche: string;
  readonly monthlyBudget: number;
  readonly targetingStrategy: TargetingStrategy;
  readonly scenarioId?: string;
  /** Defaults to "practice" */
  readonly mode?: SimulatorMode;
  /** Student's self-built campaign structure (submitted for grading) */
  readonly userAdjustedCampaigns?: ReadonlyArray<CampaignStructure>;
}

// ── Response types ─────────────────────────────────────────────────────

export interface CampaignBuilderAttemptResult {
  readonly attemptId: string;
  readonly overallScore: number;
  readonly scoreDimensions: ScoreDimensions | null;
  readonly isPassed: boolean;
  readonly campaigns: readonly CampaignStructure[];
  readonly feedback: {
    readonly passed: boolean;
    readonly overallScore: number;
    readonly overallComment: string;
    readonly remediationLinks: readonly string[];
    readonly dimensionFeedback: readonly {
      readonly dimension: string;
      readonly verdict: "excellent" | "good" | "fair" | "poor";
      readonly comment: string;
    }[];
  } | null;
}

export type CampaignBuilderAttemptResponse =
  | { ok: true; value: CampaignBuilderAttemptResult }
  | { ok: false; error: { kind: "unauthorized" } }
  | {
      ok: false;
      error: {
        kind: "validation_error" | "attempt_error" | "grading_error" | "feedback_error";
        message: string;
      };
    };

// ── Zod schemas ─────────────────────────────────────────────────────────

const matchTypeSchema = z.enum(["exact", "phrase", "broad"]);
const campaignTypeSchema = z.enum(["sponsored-products", "sponsored-brands", "sponsored-display"]);

const keywordSuggestionSchema = z.object({
  keyword: z.string().min(1),
  matchType: matchTypeSchema,
  suggestedBid: z.number().nonnegative(),
});

const adGroupSchema = z.object({
  name: z.string().min(1),
  keywords: z.array(keywordSuggestionSchema),
  suggestedBid: z.number().nonnegative(),
});

const campaignStructureSchema = z.object({
  name: z.string().min(1),
  type: campaignTypeSchema,
  dailyBudget: z.number().nonnegative(),
  adGroups: z.array(adGroupSchema),
});

const campaignBuilderAttemptSchema = z.object({
  productCategory: z.string().min(1),
  productNiche: z.string().min(1),
  monthlyBudget: z.number().positive(),
  targetingStrategy: z.enum(["auto", "manual", "hybrid"]),
  scenarioId: z.string().optional(),
  mode: z.enum(["guided", "practice", "challenge", "credential", "instructor"]).optional(),
  userAdjustedCampaigns: z.array(campaignStructureSchema).optional(),
});

// ── campaignBuilderAttempt ───────────────────────────────────────────────

export async function campaignBuilderAttempt(
  input: unknown,
): Promise<CampaignBuilderAttemptResponse> {
  // ── 1. Validate ────────────────────────────────────────────────────
  const parseResult = campaignBuilderAttemptSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        kind: "validation_error",
        message: parseResult.error.issues.map((i) => i.message).join("; "),
      },
    };
  }

  const {
    productCategory,
    productNiche,
    monthlyBudget,
    targetingStrategy,
    scenarioId,
    mode,
    userAdjustedCampaigns,
  } = parseResult.data;
  const resolvedMode: SimulatorMode = mode ?? "practice";
  const container = getContainer();

  // ── 2. Authenticate ─────────────────────────────────────────────────
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // ── 3. StartSimulatorAttempt ────────────────────────────────────────
  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "campaign-builder",
    scenarioId: scenarioId ?? "campaign-builder-scenario-default",
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
  const sim = container.simulatorRegistry.get("campaign-builder");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "campaign-builder simulator not registered" },
    };
  }

  const domainInput: CampaignBuilderInput = {
    productCategory,
    productNiche,
    monthlyBudget,
    targetingStrategy,
    ...(userAdjustedCampaigns !== undefined ? { userAdjustedCampaigns } : {}),
  };

  let simOutput: CampaignBuilderOutput;
  try {
    simOutput = (await sim.run(domainInput)) as CampaignBuilderOutput;
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
  let feedback: CampaignBuilderAttemptResult["feedback"] = null;

  if (simOutput.scoreDimensions !== null) {
    const gradeResult = await container.gradeSimulatorAttempt.execute({
      attemptId,
      scoreDimensions: {
        structureQuality: simOutput.scoreDimensions.structureQuality,
        budgetAllocation: simOutput.scoreDimensions.budgetAllocation,
        keywordRelevance: simOutput.scoreDimensions.keywordRelevance,
      },
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

    // ── 5. ComposeAttemptFeedback ───────────────────────────────────
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
  return {
    ok: true,
    value: {
      attemptId,
      overallScore: simOutput.score,
      scoreDimensions: simOutput.scoreDimensions,
      isPassed:
        simOutput.scoreDimensions !== null
          ? (simOutput.scoreDimensions.structureQuality ?? 0) >= 50
          : false,
      campaigns: simOutput.campaigns,
      feedback,
    },
  };
}

// ── Legacy: buildCampaign ────────────────────────────────────────────────

export type BuildCampaignInput = {
  productCategory: string;
  productNiche: string;
  monthlyBudget: number;
  targetingStrategy: TargetingStrategy;
};

export type BuildCampaignResult =
  | { ok: true; value: CampaignBuilderOutput }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

const VALID_STRATEGIES: ReadonlyArray<TargetingStrategy> = ["auto", "manual", "hybrid"];

/**
 * Legacy server action — kept for backward compatibility.
 * Calls the simulator directly with no user adjustments, so scoreDimensions
 * is always null (preview/exploration mode).
 */
export async function buildCampaign(input: BuildCampaignInput): Promise<BuildCampaignResult> {
  if (
    !input ||
    typeof input.productCategory !== "string" ||
    input.productCategory.length === 0 ||
    typeof input.productNiche !== "string" ||
    input.productNiche.length === 0 ||
    typeof input.monthlyBudget !== "number" ||
    input.monthlyBudget <= 0 ||
    !VALID_STRATEGIES.includes(input.targetingStrategy)
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid_input",
        message: "Need product category, niche, budget > 0, and a valid targeting strategy",
      },
    };
  }

  const container = getContainer();
  const sim = container.simulatorRegistry.get("campaign-builder");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "Campaign Builder simulator not registered" },
    };
  }

  const domainInput: CampaignBuilderInput = {
    productCategory: input.productCategory,
    productNiche: input.productNiche,
    monthlyBudget: input.monthlyBudget,
    targetingStrategy: input.targetingStrategy,
  };
  try {
    const output = (await sim.run(domainInput)) as CampaignBuilderOutput;
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
