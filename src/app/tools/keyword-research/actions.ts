/**
 * Keyword Research — server actions.
 *
 * STORY-081: Keyword Research is now its own registry entry with its own
 * workflow, scoring, and state — no longer a page-level alias that reused
 * ListingAuditSimulator's hardcoded keyword-template generator.
 *
 * `previewKeywordResearch()` resolves the niche's KeywordDataset (curated
 * starter niche, or a deterministic synthetic fallback for any other
 * niche — see StaticKeywordDatasetRepository) and returns the keyword rows
 * with their market metrics but WITHOUT the ground-truth intent/negative
 * labels: those are what the student is being asked to judge.
 *
 * `keywordResearchAttempt()` follows the full attempt lifecycle established
 * by STORY-067/068/069/080 (STR Triage, Bid Elevator, Campaign Builder,
 * Listing Audit):
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. saveSimulatorDecision — persists keywordDatasetId/Version + the
 *      student's raw classifications (SimulatorAttempt has no dedicated
 *      dataset-version field, so this is where that provenance lives)
 *   3. KeywordResearchSimulator.run() — grades classifications against the
 *      dataset's own labels
 *   4. SubmitSimulatorAttempt — transitions in_progress -> submitted
 *   5. GradeSimulatorAttempt — requires "submitted" status; persists the
 *      grade with score dimensions (submitted -> graded)
 *   6. ComposeAttemptFeedback — requires "graded" status
 *
 * Submit must run before grade, and grade before feedback: each use case
 * enforces its own required prior status (GradeSimulatorAttempt rejects
 * anything but "submitted"; ComposeAttemptFeedback requires "graded").
 * SaveSimulatorDecision is the only thing that runs while still
 * "in_progress".
 *
 * STORY-085: `keywordResearchAttempt()` resolves the scenarioId from the
 * currently published keyword-research SimulatorScenario server-side
 * instead of a hardcoded constant, so publishing a new version takes
 * effect. `niche` itself stays client-supplied — that's an intentional
 * design decision, not a trust gap: the student can research any niche,
 * and KeywordDataset content (STORY-081) is resolved fresh server-side
 * via keywordDatasetRepo.findByNiche() regardless of what niche is asked
 * for, so there's nothing to forge.
 *
 * STORY-088: a passing Challenge-mode attempt awards a one-time
 * `XPService.SIMULATOR_CHALLENGE_PASSED_XP` bonus.
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { buildContainer, getContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { KeywordIntent } from "@/domain/entities/KeywordDataset";
import type {
  KeywordResearchInput,
  KeywordUserClassification,
} from "@/domain/simulator/keyword-research/KeywordResearchInput";
import type { KeywordResearchOutput } from "@/domain/simulator/keyword-research/KeywordResearchOutput";
import type { FeedbackVerdict } from "@/domain/entities/AttemptFeedback";
import { XPService } from "@/domain/services/XPService";
import { hasEverPassedSimulatorInMode } from "@/usecases/CheckChallengeModeUnlocked";

const KEYWORD_INTENTS: readonly KeywordIntent[] = [
  "core",
  "feature",
  "problem",
  "useCase",
  "competitor",
  "ownBrand",
  "irrelevant",
];

// ── previewKeywordResearch ───────────────────────────────────────────────

export interface KeywordPreviewRow {
  readonly term: string;
  readonly normalizedTerm: string;
  readonly monthlySearchVolume: number;
  readonly competitionIndex: number;
  readonly suggestedBidLow: number;
  readonly suggestedBidMedian: number;
  readonly suggestedBidHigh: number;
  readonly relevanceScore: number;
  readonly seasonalityIndex: number;
}

export interface KeywordPreview {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly sourceType: "curated_export" | "synthetic_calibrated";
  readonly categoryId: string;
  readonly nicheId: string;
  readonly keywords: readonly KeywordPreviewRow[];
}

export type PreviewKeywordResearchInput = { niche: string };

export type PreviewKeywordResearchResult =
  | { ok: true; value: KeywordPreview }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

export async function previewKeywordResearch(
  input: PreviewKeywordResearchInput,
): Promise<PreviewKeywordResearchResult> {
  if (!input || typeof input.niche !== "string" || input.niche.trim().length === 0) {
    return { ok: false, error: { kind: "invalid_input", message: "Niche is required." } };
  }

  const container = buildContainer();
  const datasetResult = await container.keywordDatasetRepo.findByNiche(input.niche.trim());
  if (Result.isErr(datasetResult)) {
    return {
      ok: false,
      error: {
        kind: "invalid_input",
        message: "Could not resolve a keyword dataset for that niche.",
      },
    };
  }

  const sim = container.simulatorRegistry.get("keyword-research");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "Keyword Research simulator not registered" },
    };
  }

  const domainInput: KeywordResearchInput = { dataset: datasetResult.value };
  try {
    const output = (await sim.run(domainInput)) as KeywordResearchOutput;
    return {
      ok: true,
      value: {
        datasetId: output.datasetId,
        datasetVersion: output.datasetVersion,
        sourceType: output.sourceType,
        categoryId: output.categoryId,
        nicheId: output.nicheId,
        keywords: output.keywords.map((k) => ({
          term: k.term,
          normalizedTerm: k.normalizedTerm,
          monthlySearchVolume: k.monthlySearchVolume,
          competitionIndex: k.competitionIndex,
          suggestedBidLow: k.suggestedBidLow,
          suggestedBidMedian: k.suggestedBidMedian,
          suggestedBidHigh: k.suggestedBidHigh,
          relevanceScore: k.relevanceScore,
          seasonalityIndex: k.seasonalityIndex,
        })),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: { kind: "engine_error", message: err instanceof Error ? err.message : String(err) },
    };
  }
}

// ── keywordResearchAttempt() — full grading lifecycle ───────────────────

const classificationSchema = z.object({
  intent: z.enum(KEYWORD_INTENTS),
  isNegative: z.boolean(),
});

const keywordResearchAttemptSchema = z.object({
  niche: z.string().min(1),
  classifications: z.record(z.string(), classificationSchema),
  mode: z.enum(["guided", "practice", "challenge", "credential", "instructor"]).optional(),
});

export interface KeywordResearchAttemptResult {
  readonly attemptId: string;
  readonly overallScore: number;
  readonly scoreDimensions: Record<string, number>;
  readonly isPassed: boolean;
  readonly keywords: KeywordResearchOutput["keywords"];
  readonly xpAwarded: number | null;
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
  };
}

export type KeywordResearchAttemptResponse =
  | { ok: true; value: KeywordResearchAttemptResult }
  | { ok: false; error: { kind: "unauthorized" } }
  | {
      ok: false;
      error: {
        kind:
          | "validation_error"
          | "credential_requires_curated_dataset"
          | "attempt_error"
          | "grading_error"
          | "feedback_error";
        message: string;
      };
    };

export async function keywordResearchAttempt(
  input: unknown,
): Promise<KeywordResearchAttemptResponse> {
  // ── 1. Validate ────────────────────────────────────────────────────
  const parseResult = keywordResearchAttemptSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        kind: "validation_error",
        message: parseResult.error.issues.map((i) => i.message).join("; "),
      },
    };
  }

  const { niche, classifications, mode } = parseResult.data;
  const resolvedMode: SimulatorMode = mode ?? "practice";
  const container = getContainer();

  // ── 2. Authenticate ─────────────────────────────────────────────────
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // ── 3. Resolve dataset ──────────────────────────────────────────────
  const datasetResult = await container.keywordDatasetRepo.findByNiche(niche);
  if (Result.isErr(datasetResult)) {
    return {
      ok: false,
      error: {
        kind: "validation_error",
        message: "Could not resolve a keyword dataset for that niche.",
      },
    };
  }
  const dataset = datasetResult.value;

  // Formal assessments/leaderboard scores use curated datasets only
  // (docs/stories/STORY-081.md). None of today's starter datasets are
  // curated_export yet -- that gate is real even though it currently
  // rejects every credential-mode attempt.
  if (resolvedMode === "credential" && dataset.sourceType !== "curated_export") {
    return {
      ok: false,
      error: {
        kind: "credential_requires_curated_dataset",
        message:
          "This niche's keyword dataset is synthetic (practice-mode only) and cannot be used for a credential attempt.",
      },
    };
  }

  // ── 4. Resolve the published scenario (id only — content is the
  //      dataset resolved above, not this scenario's inputSchema) ───────
  const scenarioResult = await container.scenarioRepo.findPublished("keyword-research");
  if (!scenarioResult.ok || !scenarioResult.value) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "No published keyword-research scenario found" },
    };
  }

  // ── 5. StartSimulatorAttempt ────────────────────────────────────────
  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "keyword-research",
    scenarioId: scenarioResult.value.id,
    mode: resolvedMode,
  });

  if (Result.isErr(startResult)) {
    return { ok: false, error: { kind: "attempt_error", message: startResult.error.kind } };
  }

  const attemptId = startResult.value.attemptId;

  // ── 6. Save decision (dataset provenance + raw classifications) ─────
  const decisionResult = await container.saveSimulatorDecision.execute({
    attemptId,
    decisionData: {
      type: "keyword-research-classification",
      keywordDatasetId: dataset.datasetId,
      keywordDatasetVersion: dataset.version,
      classifications,
    },
  });
  if (Result.isErr(decisionResult)) {
    container.logger.warn("Failed to save keyword-research decision", {
      attemptId,
      error: decisionResult.error,
    });
  }

  // ── 7. Run simulator ────────────────────────────────────────────────
  const sim = container.simulatorRegistry.get("keyword-research");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "keyword-research simulator not registered" },
    };
  }

  const userClassifications: Record<string, KeywordUserClassification> = classifications;
  const domainInput: KeywordResearchInput = { dataset, userClassifications };

  let simOutput: KeywordResearchOutput;
  try {
    simOutput = (await sim.run(domainInput)) as KeywordResearchOutput;
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "grading_error",
        message: err instanceof Error ? err.message : "Simulator failed",
      },
    };
  }

  const scoreDimensions = simOutput.scoreDimensions ?? {
    intentAccuracy: 0,
    negativeIdentification: 0,
  };

  // ── 8. SubmitSimulatorAttempt ─────────────────────────────────────────
  // Must happen before grading: GradeSimulatorAttempt requires "submitted"
  // status, and SubmitSimulatorAttempt is the only thing that transitions
  // the attempt out of "in_progress".
  const submitResult = await container.submitSimulatorAttempt.execute({ attemptId });
  if (Result.isErr(submitResult)) {
    return { ok: false, error: { kind: "attempt_error", message: submitResult.error.kind } };
  }

  // ── 9. GradeSimulatorAttempt ────────────────────────────────────────
  const gradeResult = await container.gradeSimulatorAttempt.execute({
    attemptId,
    scoreDimensions: {
      intentAccuracy: scoreDimensions.intentAccuracy,
      negativeIdentification: scoreDimensions.negativeIdentification,
    },
  });

  if (Result.isErr(gradeResult)) {
    return { ok: false, error: { kind: "grading_error", message: gradeResult.error.kind } };
  }

  const grade = gradeResult.value;

  // ── 10. ComposeAttemptFeedback ───────────────────────────────────────
  const feedbackResult = await container.composeAttemptFeedback.execute({ attemptId });
  if (Result.isErr(feedbackResult)) {
    return { ok: false, error: { kind: "feedback_error", message: feedbackResult.error.kind } };
  }
  const feedback = feedbackResult.value.feedback;

  // ── 11. Award Challenge-mode XP (once per simulator, first pass only) ─
  let xpAwarded: number | null = null;
  if (resolvedMode === "challenge" && feedback.passed) {
    const alreadyEarnedResult = await hasEverPassedSimulatorInMode(
      { attemptRepo: container.simulatorAttemptRepo, scorePolicyRepo: container.scorePolicyRepo },
      { userId, simulatorId: "keyword-research", mode: "challenge", excludeAttemptId: attemptId },
    );
    const alreadyEarned = Result.isOk(alreadyEarnedResult) && alreadyEarnedResult.value;
    if (!alreadyEarned) {
      const xpResult = await container.awardXp.execute({
        userId,
        amount: XPService.SIMULATOR_CHALLENGE_PASSED_XP,
        reason: "simulator_challenge_passed",
        refId: attemptId,
      });
      if (Result.isOk(xpResult)) {
        xpAwarded = XPService.SIMULATOR_CHALLENGE_PASSED_XP;
      }
    }
  }

  // ── 12. Return results ──────────────────────────────────────────────
  return {
    ok: true,
    value: {
      attemptId,
      overallScore: grade.overallScore,
      scoreDimensions: grade.scoreDimensions,
      isPassed: grade.isPassed,
      keywords: simOutput.keywords,
      xpAwarded,
      feedback: {
        passed: feedback.passed,
        overallScore: feedback.overallScore,
        overallComment: feedback.overallComment,
        remediationLinks: feedback.remediationLinks,
        dimensionFeedback: feedback.dimensionFeedback.map((d) => ({
          dimension: d.dimension,
          verdict: d.verdict,
          comment: d.comment,
        })),
      },
    },
  };
}
