/**
 * Listing Audit — server actions.
 *
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 * STORY-081 split Keyword Research into its own simulator/registry entry
 * (src/app/tools/keyword-research/) -- it no longer shares this file.
 *
 * Adds `listingAuditAttempt()`, which follows the full attempt lifecycle
 * established by STORY-067/068/069 (STR Triage, Bid Elevator, Campaign
 * Builder):
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. ListingAuditSimulator.run() — computes dimension scores from the
 *      student's fix/skip triage of each finding
 *   3. GradeSimulatorAttempt — persists the grade with score dimensions
 *   4. ComposeAttemptFeedback — generates actionable student feedback
 *
 * `auditListing()` is kept as the legacy preview-only wrapper.
 *
 * STORY-085: `category`/`niche`/`images`/`hasVideo`/`hasAPlus`/`marketplace`
 * are no longer accepted from the client — a malicious caller could
 * otherwise forge a friendlier category to game which rubric variant
 * applies. Both functions now resolve the *currently published*
 * listing-audit scenario server-side and use its content for those
 * fields; only `title`/`bullets`/`description` (the student's actual
 * submission) are trusted from the client. This also means publishing a
 * new scenario version through the admin UI (see PublishSimulatorScenario)
 * takes effect immediately, instead of both functions being pinned to a
 * hardcoded scenario id that versioning could never change.
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { buildContainer, getContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { AppContainer } from "@/composition/container";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type {
  ListingAuditInput,
  ListingImage,
} from "@/domain/simulator/listing-audit/ListingAuditInput";
import type {
  ListingAuditOutput,
  FindingAction,
  GradedFinding,
} from "@/domain/simulator/listing-audit/ListingAuditOutput";
import { listingAuditScenarioContentSchema } from "./scenarioContent";

async function resolvePublishedScenario(container: AppContainer) {
  const result = await container.scenarioRepo.findPublished("listing-audit");
  if (!result.ok || !result.value) {
    return null;
  }
  const parsed = listingAuditScenarioContentSchema.safeParse(result.value.inputSchema);
  if (!parsed.success) {
    return null;
  }
  return { scenarioId: result.value.id, content: parsed.data };
}

export type AuditListingInput = {
  title: string;
  bullets: ReadonlyArray<string>;
  description: string;
};

export type AuditListingResult =
  | { ok: true; value: ListingAuditOutput }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

export async function auditListing(input: AuditListingInput): Promise<AuditListingResult> {
  if (
    !input ||
    typeof input.title !== "string" ||
    input.title.length === 0 ||
    !Array.isArray(input.bullets) ||
    input.bullets.some((b) => typeof b !== "string") ||
    typeof input.description !== "string"
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid_input",
        message: "Need title, ≥0 bullets, description",
      },
    };
  }

  const container = buildContainer();
  const sim = container.simulatorRegistry.get("listing-audit");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "Listing Audit simulator not registered" },
    };
  }

  const scenario = await resolvePublishedScenario(container);
  if (!scenario) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "No published listing-audit scenario found" },
    };
  }

  const domainInput: ListingAuditInput = {
    title: input.title,
    bullets: input.bullets,
    description: input.description,
    category: scenario.content.category,
    niche: scenario.content.niche,
    marketplace: scenario.content.marketplace,
    images: scenario.content.images as unknown as readonly ListingImage[],
    hasVideo: scenario.content.hasVideo,
    hasAPlus: scenario.content.hasAPlus,
  };
  try {
    const output = (await sim.run(domainInput)) as ListingAuditOutput;
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

// ── listingAuditAttempt() — full grading lifecycle ─────────────────────

export interface ListingAuditAttemptInput {
  readonly title: string;
  readonly bullets: ReadonlyArray<string>;
  readonly description: string;
  /**
   * Student's per-finding fix/skip decisions. Keys are finding ids from a
   * prior preview call's `gradedFindings`.
   */
  readonly userFindingActions: Readonly<Record<string, FindingAction>>;
  readonly difficulty?: string;
  readonly mode?: string;
}

export interface ListingAuditAttemptResult {
  readonly ok: true;
  readonly value: {
    readonly attemptId: string;
    readonly overallScore: number;
    readonly scoreDimensions: Record<string, number>;
    readonly isPassed: boolean;
    readonly gradedFindings: ReadonlyArray<{
      readonly id: string;
      readonly category: string;
      readonly severity: string;
      readonly message: string;
      readonly suggestion: string;
      readonly groundTruth: FindingAction;
      readonly userChoice: FindingAction | undefined;
      readonly isCorrect: boolean;
    }>;
    readonly feedback: {
      readonly passed: boolean;
      readonly overallScore: number;
      readonly overallComment: string;
      readonly remediationLinks: readonly string[];
      readonly dimensionFeedback: ReadonlyArray<{
        readonly dimension: string;
        readonly verdict: string;
        readonly score: number;
        readonly comment: string;
        readonly recommendation: string;
      }>;
    };
  };
}

export type ListingAuditAttemptError =
  | { ok: false; error: { kind: "unauthorized" } }
  | { ok: false; error: { kind: "validation_error"; message: string } }
  | { ok: false; error: { kind: "attempt_error"; message: string } }
  | { ok: false; error: { kind: "grading_error"; message: string } }
  | { ok: false; error: { kind: "feedback_error"; message: string } };

export type ListingAuditAttemptResponse = ListingAuditAttemptResult | ListingAuditAttemptError;

// ── Validation ─────────────────────────────────────────────────────────

const VALID_FINDING_ACTIONS: readonly FindingAction[] = ["fix", "skip"];

const listingAuditAttemptSchema = z.object({
  title: z.string().min(1),
  bullets: z.array(z.string()),
  description: z.string(),
  userFindingActions: z.record(
    z.string(),
    z.enum(VALID_FINDING_ACTIONS as [FindingAction, ...FindingAction[]]),
  ),
  difficulty: z.string().optional(),
  mode: z.string().optional(),
});

// ── Action ─────────────────────────────────────────────────────────────

/**
 * Run the full Listing Audit attempt lifecycle:
 * start → grade → compose feedback → return results.
 */
export async function listingAuditAttempt(input: unknown): Promise<ListingAuditAttemptResponse> {
  // ── 1. Validate ────────────────────────────────────────────────────
  const parseResult = listingAuditAttemptSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        kind: "validation_error",
        message: parseResult.error.issues.map((i) => i.message).join("; "),
      },
    };
  }

  const { title, bullets, description, userFindingActions, mode } = parseResult.data;
  const resolvedMode = mode ?? "practice";
  const container = getContainer();

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
      error: { kind: "attempt_error", message: "No published listing-audit scenario found" },
    };
  }

  // ── 4. StartSimulatorAttempt ────────────────────────────────────────
  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "listing-audit",
    scenarioId: scenario.scenarioId,
    mode: resolvedMode as SimulatorMode,
  });

  if (Result.isErr(startResult)) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: startResult.error.kind },
    };
  }

  const attemptId = startResult.value.attemptId;

  // ── 5. Save decisions (user fix/skip triage as decisions) ──────────
  for (const [findingId, action] of Object.entries(userFindingActions)) {
    const decisionResult = await container.saveSimulatorDecision.execute({
      attemptId,
      decisionData: {
        type: "listing-audit-finding-triage",
        findingId,
        action,
      },
    });

    // Non-fatal: continue even if decision save fails
    if (Result.isErr(decisionResult)) {
      console.warn(`Failed to save decision for finding "${findingId}":`, decisionResult.error);
    }
  }

  // ── 6. Run simulator to get dimension scores ─────────────────────────
  const sim = container.simulatorRegistry.get("listing-audit");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "listing-audit simulator not registered" },
    };
  }

  let simOutput: ListingAuditOutput;
  try {
    const simInput: ListingAuditInput = {
      title,
      bullets,
      description,
      category: scenario.content.category,
      niche: scenario.content.niche,
      marketplace: scenario.content.marketplace,
      images: scenario.content.images as unknown as readonly ListingImage[],
      hasVideo: scenario.content.hasVideo,
      hasAPlus: scenario.content.hasAPlus,
      userFindingActions: { ...userFindingActions },
    };
    simOutput = (await sim.run(simInput)) as ListingAuditOutput;
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "grading_error",
        message: err instanceof Error ? err.message : "Simulator failed",
      },
    };
  }

  // If no scoreDimensions (shouldn't happen when userFindingActions provided), compute flat
  const scoreDimensions = simOutput.scoreDimensions ?? {
    direction: simOutput.score,
    priorityCoverage: 0,
    reviewCoverage: 0,
  };

  // ── 7. GradeSimulatorAttempt ────────────────────────────────────────
  const gradeResult = await container.gradeSimulatorAttempt.execute({
    attemptId,
    scoreDimensions: {
      direction: scoreDimensions.direction,
      priorityCoverage: scoreDimensions.priorityCoverage,
    },
  });

  if (Result.isErr(gradeResult)) {
    return {
      ok: false,
      error: { kind: "grading_error", message: gradeResult.error.kind },
    };
  }

  const grade = gradeResult.value;

  // ── 8. ComposeAttemptFeedback ───────────────────────────────────────
  const feedbackResult = await container.composeAttemptFeedback.execute({
    attemptId,
  });

  if (Result.isErr(feedbackResult)) {
    return {
      ok: false,
      error: { kind: "feedback_error", message: feedbackResult.error.kind },
    };
  }

  const feedback = feedbackResult.value.feedback;

  // ── 9. SubmitSimulatorAttempt ───────────────────────────────────────
  await container.submitSimulatorAttempt.execute({ attemptId });

  // ── 10. Return results ──────────────────────────────────────────────
  return {
    ok: true,
    value: {
      attemptId,
      overallScore: grade.overallScore,
      scoreDimensions: grade.scoreDimensions,
      isPassed: grade.isPassed,
      gradedFindings: simOutput.gradedFindings.map((f: GradedFinding) => ({
        id: f.id,
        category: f.category,
        severity: f.severity,
        message: f.message,
        suggestion: f.suggestion,
        groundTruth: f.groundTruth,
        userChoice: f.userChoice ?? userFindingActions[f.id],
        isCorrect: f.isCorrect,
      })),
      feedback: {
        passed: feedback.passed,
        overallScore: feedback.overallScore,
        overallComment: feedback.overallComment,
        remediationLinks: feedback.remediationLinks,
        dimensionFeedback: feedback.dimensionFeedback.map((d) => ({
          dimension: d.dimension,
          verdict: d.verdict,
          score: d.score,
          comment: d.comment,
          recommendation: d.recommendation,
        })),
      },
    },
  };
}
