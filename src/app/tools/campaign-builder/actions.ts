/**
 * campaign-builder/actions.ts — server actions for the Campaign Builder simulator.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 *
 * `campaignBuilderAttempt()` follows the full attempt lifecycle:
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. CampaignBuilderSimulator.run() — computes dimension scores from user-adjusted campaigns
 *   3. saveSimulatorDecision — records the submitted campaign structure
 *      (audit trail; also satisfies SubmitSimulatorAttempt's "at least
 *      one decision" rule)
 *   4. SubmitSimulatorAttempt — transitions in_progress -> submitted
 *      (must run before grading: GradeSimulatorAttempt requires status
 *      "submitted")
 *   5. GradeSimulatorAttempt — persists the grade with score dimensions
 *   6. ComposeAttemptFeedback — generates actionable student feedback
 *
 * STORY-085: the legacy `buildCampaign()` wrapper is removed — it never
 * persisted a SimulatorAttempt at all, so every campaign-builder "run" was
 * silently unattemptable/unattempted. CampaignBuilderForm now calls
 * `campaignBuilderAttempt()` directly, giving campaign-builder its first
 * real persisted-attempt path. `productCategory`/`productNiche`/
 * `monthlyBudget` are no longer accepted from the client — they're the
 * scenario's actual content (per SCENARIO in the old page.tsx, that's
 * genuinely all a campaign-builder scenario carries), so trusting them
 * from the client would let a forged budget/niche pick an easier scoring
 * target. Both are now resolved server-side from the currently published
 * campaign-builder SimulatorScenario. Only `targetingStrategy` (the
 * student's real choice) and `userAdjustedCampaigns` (the student's
 * self-built campaign structure, now collected by CampaignBuilderForm's
 * manual editor) remain client input.
 *
 * Also fixed in the same pass: grading used to be attempted with no prior
 * saveSimulatorDecision/SubmitSimulatorAttempt call at all — a real,
 * pre-existing bug (predates STORY-085) that made every graded call fail
 * in production, since GradeSimulatorAttempt rejects anything that isn't
 * already "submitted", and SubmitSimulatorAttempt itself rejects an
 * attempt with zero saved decisions. Unit tests never caught it because
 * they mock gradeSimulatorAttempt.execute() directly rather than
 * exercising the real use cases' status checks.
 *
 * STORY-088: the returned `isPassed` used to be a rough, disconnected
 * heuristic (`structureQuality >= 50`) instead of the actual ScorePolicy
 * pass/fail already computed by GradeSimulatorAttempt and re-derived by
 * ComposeAttemptFeedback — fixed to use `feedback.passed`, the
 * authoritative source. This also means Challenge-mode attempts that pass
 * now award a one-time `XPService.SIMULATOR_CHALLENGE_PASSED_XP` bonus.
 *
 * STORY-084: scoring expands to 7 dimensions (see
 * docs/stories/STORY-084.md) — all 7 are now passed into
 * GradeSimulatorAttempt, not just structureQuality/budgetAllocation/
 * keywordRelevance. The scenario's brand-taxonomy/ASIN/budget-
 * reconciliation fields are resolved server-side alongside the rest of
 * the scenario content, same trust boundary as productCategory/
 * productNiche/monthlyBudget. `userAdjustedCampaigns` may now include
 * `negativeKeywords` per campaign.
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { CampaignBuilderInput } from "@/domain/simulator/campaign-builder/CampaignBuilderInput";
import type {
  CampaignBuilderOutput,
  CampaignStructure,
  ScoreDimensions,
} from "@/domain/simulator/campaign-builder/CampaignBuilderOutput";
import { XPService } from "@/domain/services/XPService";
import { hasEverPassedSimulatorInMode } from "@/usecases/CheckChallengeModeUnlocked";
import { campaignBuilderScenarioContentSchema } from "./scenarioContent";

// ── Input types ─────────────────────────────────────────────────────────

export interface CampaignBuilderAttemptResult {
  readonly attemptId: string;
  readonly overallScore: number;
  readonly scoreDimensions: ScoreDimensions | null;
  readonly isPassed: boolean;
  readonly campaigns: readonly CampaignStructure[];
  readonly xpAwarded: number | null;
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

const negativeKeywordSchema = z.object({
  text: z.string().min(1),
  matchType: z.enum(["negativeExact", "negativePhrase"]),
  level: z.enum(["campaign", "adGroup"]),
  reason: z.string(),
});

const campaignStructureSchema = z.object({
  name: z.string().min(1),
  type: campaignTypeSchema,
  dailyBudget: z.number().nonnegative(),
  adGroups: z.array(adGroupSchema),
  negativeKeywords: z.array(negativeKeywordSchema).optional(),
});

const campaignBuilderAttemptSchema = z.object({
  targetingStrategy: z.enum(["auto", "manual", "hybrid"]),
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

  const { targetingStrategy, mode, userAdjustedCampaigns } = parseResult.data;
  const resolvedMode: SimulatorMode = mode ?? "practice";
  const container = buildContainer();

  // ── 2. Authenticate ─────────────────────────────────────────────────
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // ── 3. Resolve the published scenario server-side ───────────────────
  const scenarioResult = await container.scenarioRepo.findPublished("campaign-builder");
  if (!scenarioResult.ok || !scenarioResult.value) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "No published campaign-builder scenario found" },
    };
  }
  const parsedContent = campaignBuilderScenarioContentSchema.safeParse(
    scenarioResult.value.inputSchema,
  );
  if (!parsedContent.success) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "Published scenario content is malformed" },
    };
  }
  const {
    productCategory,
    productNiche,
    monthlyBudget,
    brandName,
    brandAliases,
    brandMisspellings,
    brandProductNames,
    competitorBrands,
    asin,
    planningPeriodDays,
    accountDailyBudgetCap,
  } = parsedContent.data;

  // ── 4. StartSimulatorAttempt ────────────────────────────────────────
  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "campaign-builder",
    scenarioId: scenarioResult.value.id,
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
    brandName,
    brandAliases,
    brandMisspellings,
    brandProductNames,
    competitorBrands,
    asin,
    planningPeriodDays,
    accountDailyBudgetCap,
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

  // ── 6. GradeSimulatorAttempt ────────────────────────────────────────
  let feedback: CampaignBuilderAttemptResult["feedback"] = null;

  if (simOutput.scoreDimensions !== null) {
    // Save a decision (audit trail; also satisfies SubmitSimulatorAttempt's
    // "at least one decision" precondition), then submit before grading —
    // GradeSimulatorAttempt requires status="submitted".
    await container.saveSimulatorDecision.execute({
      attemptId,
      decisionData: { type: "campaign-builder-structure", campaigns: userAdjustedCampaigns },
    });

    const submitResult = await container.submitSimulatorAttempt.execute({ attemptId });
    if (Result.isErr(submitResult)) {
      return {
        ok: false,
        error: { kind: "attempt_error", message: submitResult.error.kind },
      };
    }

    const gradeResult = await container.gradeSimulatorAttempt.execute({
      attemptId,
      scoreDimensions: {
        keywordRelevance: simOutput.scoreDimensions.keywordRelevance,
        structureQuality: simOutput.scoreDimensions.structureQuality,
        negativeRouting: simOutput.scoreDimensions.negativeRouting,
        budgetAllocation: simOutput.scoreDimensions.budgetAllocation,
        brandedIsolation: simOutput.scoreDimensions.brandedIsolation,
        duplicateControl: simOutput.scoreDimensions.duplicateControl,
        namingCompliance: simOutput.scoreDimensions.namingCompliance,
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

    // ── 7. ComposeAttemptFeedback ───────────────────────────────────
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

  // ── 8. Award Challenge-mode XP (once per simulator, first pass only) ──
  let xpAwarded: number | null = null;
  if (resolvedMode === "challenge" && feedback?.passed) {
    const alreadyEarnedResult = await hasEverPassedSimulatorInMode(
      { attemptRepo: container.simulatorAttemptRepo, scorePolicyRepo: container.scorePolicyRepo },
      { userId, simulatorId: "campaign-builder", mode: "challenge", excludeAttemptId: attemptId },
    );
    const alreadyEarned = Result.isOk(alreadyEarnedResult) && alreadyEarnedResult.value;
    if (!alreadyEarned) {
      const xpResult = await container.awardXp.execute({
        userId,
        amount: XPService.SIMULATOR_CHALLENGE_PASSED_XP,
        reason: "simulator_challenge_passed",
        refId: attemptId,
        idempotencyKey: `simulator_challenge_passed:${userId}:${attemptId}`,
      });
      if (Result.isOk(xpResult)) {
        xpAwarded = XPService.SIMULATOR_CHALLENGE_PASSED_XP;
      }
    }
  }

  // ── 9. Return results ────────────────────────────────────────────────
  return {
    ok: true,
    value: {
      attemptId,
      overallScore: simOutput.score,
      scoreDimensions: simOutput.scoreDimensions,
      isPassed: feedback?.passed ?? false,
      campaigns: simOutput.campaigns,
      xpAwarded,
      feedback,
    },
  };
}
