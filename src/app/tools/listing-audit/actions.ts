/**
 * Listing Audit + Keyword Research — server actions.
 *
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
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
 * `auditListing()` is kept as the legacy preview-only wrapper (mirrors
 * `classifyStr()`).
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer, getContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { ListingAuditInput } from "@/domain/simulator/listing-audit/ListingAuditInput";
import type {
  ListingAuditOutput,
  FindingAction,
  GradedFinding,
} from "@/domain/simulator/listing-audit/ListingAuditOutput";

export type AuditListingInput = {
  title: string;
  bullets: ReadonlyArray<string>;
  description: string;
  category: string;
  niche: string;
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
    typeof input.description !== "string" ||
    typeof input.category !== "string" ||
    input.category.length === 0 ||
    typeof input.niche !== "string" ||
    input.niche.length === 0
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid_input",
        message: "Need title, ≥0 bullets, description, category, niche",
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

  const domainInput: ListingAuditInput = {
    title: input.title,
    bullets: input.bullets,
    description: input.description,
    category: input.category,
    niche: input.niche,
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
  readonly category: string;
  readonly niche: string;
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

function validateAttemptInput(
  input: unknown,
): ListingAuditAttemptInput | { kind: "validation_error"; message: string } {
  if (!input || typeof input !== "object") {
    return { kind: "validation_error", message: "Input must be an object" };
  }
  const obj = input as Record<string, unknown>;

  if (typeof obj.title !== "string" || obj.title.length === 0) {
    return { kind: "validation_error", message: "title must be a non-empty string" };
  }
  if (!Array.isArray(obj.bullets) || obj.bullets.some((b) => typeof b !== "string")) {
    return { kind: "validation_error", message: "bullets must be an array of strings" };
  }
  if (typeof obj.description !== "string") {
    return { kind: "validation_error", message: "description must be a string" };
  }
  if (typeof obj.category !== "string" || obj.category.length === 0) {
    return { kind: "validation_error", message: "category must be a non-empty string" };
  }
  if (typeof obj.niche !== "string" || obj.niche.length === 0) {
    return { kind: "validation_error", message: "niche must be a non-empty string" };
  }
  if (!obj.userFindingActions || typeof obj.userFindingActions !== "object") {
    return { kind: "validation_error", message: "userFindingActions must be an object" };
  }
  const userFindingActions = obj.userFindingActions as Record<string, unknown>;
  for (const [findingId, action] of Object.entries(userFindingActions)) {
    if (!VALID_FINDING_ACTIONS.includes(action as FindingAction)) {
      return {
        kind: "validation_error",
        message: `Invalid action "${String(action)}" for finding "${findingId}". Valid actions: ${VALID_FINDING_ACTIONS.join(", ")}`,
      };
    }
  }

  return {
    title: obj.title,
    bullets: obj.bullets as ReadonlyArray<string>,
    description: obj.description,
    category: obj.category,
    niche: obj.niche,
    userFindingActions: userFindingActions as Record<string, FindingAction>,
  };
}

// ── Action ─────────────────────────────────────────────────────────────

/**
 * Run the full Listing Audit attempt lifecycle:
 * start → grade → compose feedback → return results.
 */
export async function listingAuditAttempt(input: unknown): Promise<ListingAuditAttemptResponse> {
  // ── 1. Validate ────────────────────────────────────────────────────
  const validated = validateAttemptInput(input);
  if ("kind" in validated && validated.kind === "validation_error") {
    return { ok: false, error: { kind: "validation_error", message: validated.message } };
  }

  const { title, bullets, description, category, niche, userFindingActions } =
    validated as ListingAuditAttemptInput;
  const mode = (validated as ListingAuditAttemptInput).mode ?? "practice";
  const container = getContainer();

  // ── 2. Authenticate ─────────────────────────────────────────────────
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // ── 3. StartSimulatorAttempt ────────────────────────────────────────
  const scenarioId = "listing-audit-scenario-bamboo-cutting-board";

  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "listing-audit",
    scenarioId,
    mode: mode as SimulatorMode,
  });

  if (Result.isErr(startResult)) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: startResult.error.kind },
    };
  }

  const attemptId = startResult.value.attemptId;

  // ── 3. Save decisions (user fix/skip triage as decisions) ──────────
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

  // ── 4. Run simulator to get dimension scores ─────────────────────────
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
      category,
      niche,
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

  // ── 5. GradeSimulatorAttempt ────────────────────────────────────────
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

  // ── 6. ComposeAttemptFeedback ───────────────────────────────────────
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

  // ── 7. SubmitSimulatorAttempt ───────────────────────────────────────
  await container.submitSimulatorAttempt.execute({ attemptId });

  // ── 8. Return results ──────────────────────────────────────────────
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
