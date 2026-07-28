/**
 * str-triage/actions.ts — server actions for the STR Triage simulator.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 *
 * Replaces the old `classifyStr()` function with `strTriageAttempt()`,
 * which follows the full attempt lifecycle:
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. StrTriageSimulator.run() — computes dimension scores from user classifications
 *   3. GradeSimulatorAttempt — persists the grade with score dimensions
 *   4. ComposeAttemptFeedback — generates actionable student feedback
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { StrTriageInput } from "@/domain/simulator/str-triage/StrTriageInput";
import type {
  StrTriageOutput,
  TriageAction,
  KeywordClassification,
} from "@/domain/simulator/str-triage/StrTriageOutput";

// ── Input types ─────────────────────────────────────────────────────────

export interface StrTriageAttemptInput {
  readonly rows: ReadonlyArray<{
    readonly keyword: string;
    readonly spend: number;
    readonly revenue: number;
    readonly orders: number;
  }>;
  readonly targetRoas: number;
  /**
   * User's per-keyword classifications. Keys are keyword strings, values are
   * the user's chosen TriageAction.
   */
  readonly userActions: Readonly<Record<string, TriageAction>>;
  readonly difficulty?: string;
  readonly mode?: string;
}

// ── Output types ────────────────────────────────────────────────────────

export interface StrTriageAttemptResult {
  readonly ok: true;
  readonly value: {
    readonly attemptId: string;
    readonly overallScore: number;
    readonly scoreDimensions: Record<string, number>;
    readonly isPassed: boolean;
    readonly classifications: ReadonlyArray<{
      readonly keyword: string;
      readonly groundTruth: TriageAction;
      readonly userChoice: TriageAction;
      readonly isCorrect: boolean;
      readonly roas: number;
      readonly spend: number;
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

export type StrTriageAttemptError =
  | { ok: false; error: { kind: "unauthorized" } }
  | { ok: false; error: { kind: "validation_error"; message: string } }
  | { ok: false; error: { kind: "attempt_error"; message: string } }
  | { ok: false; error: { kind: "grading_error"; message: string } }
  | { ok: false; error: { kind: "feedback_error"; message: string } };

export type StrTriageAttemptResponse = StrTriageAttemptResult | StrTriageAttemptError;

// ── Validation ─────────────────────────────────────────────────────────

const VALID_ACTIONS: readonly TriageAction[] = ["keep", "pause", "add_as_exact", "add_as_phrase"];

function validateInput(
  input: unknown,
): StrTriageAttemptInput | { kind: "validation_error"; message: string } {
  if (!input || typeof input !== "object") {
    return { kind: "validation_error", message: "Input must be an object" };
  }
  const obj = input as Record<string, unknown>;

  if (!Array.isArray(obj.rows) || obj.rows.length === 0) {
    return { kind: "validation_error", message: "rows must be a non-empty array" };
  }
  for (const r of obj.rows) {
    if (!r || typeof r !== "object") {
      return { kind: "validation_error", message: "Each row must be an object" };
    }
    const row = r as Record<string, unknown>;
    if (typeof row.keyword !== "string" || !row.keyword) {
      return { kind: "validation_error", message: "Each row must have a string keyword" };
    }
    if (typeof row.spend !== "number" || row.spend < 0) {
      return { kind: "validation_error", message: "Each row must have a non-negative spend" };
    }
    if (typeof row.revenue !== "number" || row.revenue < 0) {
      return { kind: "validation_error", message: "Each row must have a non-negative revenue" };
    }
  }

  if (typeof obj.targetRoas !== "number" || obj.targetRoas <= 0) {
    return { kind: "validation_error", message: "targetRoas must be a positive number" };
  }

  if (!obj.userActions || typeof obj.userActions !== "object") {
    return { kind: "validation_error", message: "userActions must be an object" };
  }
  const userActions = obj.userActions as Record<string, unknown>;
  for (const [keyword, action] of Object.entries(userActions)) {
    if (!VALID_ACTIONS.includes(action as TriageAction)) {
      return {
        kind: "validation_error",
        message: `Invalid action "${String(action)}" for keyword "${keyword}". Valid actions: ${VALID_ACTIONS.join(", ")}`,
      };
    }
  }

  return {
    rows: obj.rows as StrTriageAttemptInput["rows"],
    targetRoas: obj.targetRoas as number,
    userActions: userActions as StrTriageAttemptInput["userActions"],
  };
}

// ── Action ─────────────────────────────────────────────────────────────

/**
 * Run the full STR Triage attempt lifecycle:
 * start → grade → compose feedback → return results.
 */
export async function strTriageAttempt(input: unknown): Promise<StrTriageAttemptResponse> {
  // ── 1. Validate ────────────────────────────────────────────────────
  const validated = validateInput(input);
  if ("kind" in validated && validated.kind === "validation_error") {
    return { ok: false, error: { kind: "validation_error", message: validated.message } };
  }

  const rows = (validated as StrTriageAttemptInput).rows;
  const targetRoas = (validated as StrTriageAttemptInput).targetRoas;
  const userActions = (validated as StrTriageAttemptInput).userActions;
  const mode = (validated as StrTriageAttemptInput).mode ?? "practice";
  const container = buildContainer();

  // ── 2. Authenticate ─────────────────────────────────────────────────
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // ── 3. StartSimulatorAttempt ────────────────────────────────────────
  const scenarioId = "str-triage-scenario-kitchen-products";

  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "str-triage",
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

  // ── 4. Save decisions (user classifications as decisions) ──────────
  // Each user classification is stored as a decision for audit purposes
  for (const [keyword, action] of Object.entries(userActions)) {
    const row = rows.find((r: { keyword: string }) => r.keyword === keyword);
    if (!row) continue;

    const decisionResult = await container.saveSimulatorDecision.execute({
      attemptId,
      decisionData: {
        type: "str-triage-classification",
        keyword,
        action,
        rowData: { spend: row.spend, revenue: row.revenue, orders: row.orders },
      },
    });

    // Non-fatal: continue even if decision save fails
    if (Result.isErr(decisionResult)) {
      console.warn(`Failed to save decision for keyword "${keyword}":`, decisionResult.error);
    }
  }

  // ── 5. Run simulator to get dimension scores ─────────────────────────
  const sim = container.simulatorRegistry.get("str-triage");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "str-triage simulator not registered" },
    };
  }

  let simOutput: StrTriageOutput;
  try {
    const simInput: StrTriageInput = {
      rows: rows.map((r: { keyword: string; spend: number; revenue: number; orders: number }) => ({
        keyword: r.keyword,
        spend: r.spend,
        revenue: r.revenue,
        orders: r.orders,
      })),
      targetRoas,
      userClassifications: { ...userActions },
    };
    simOutput = (await sim.run(simInput)) as StrTriageOutput;
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "grading_error",
        message: err instanceof Error ? err.message : "Simulator failed",
      },
    };
  }

  // If no scoreDimensions (shouldn't happen when userClassifications provided), compute flat
  const scoreDimensions = simOutput.scoreDimensions ?? {
    direction: simOutput.score,
    profitability: 0,
    reviewCoverage: 0,
  };

  // ── 6. GradeSimulatorAttempt ────────────────────────────────────────
  const gradeResult = await container.gradeSimulatorAttempt.execute({
    attemptId,
    scoreDimensions: {
      direction: scoreDimensions.direction,
      profitability: scoreDimensions.profitability,
    },
  });

  if (Result.isErr(gradeResult)) {
    return {
      ok: false,
      error: { kind: "grading_error", message: gradeResult.error.kind },
    };
  }

  const grade = gradeResult.value;

  // ── 7. ComposeAttemptFeedback ───────────────────────────────────────
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

  // ── 8. SubmitSimulatorAttempt ───────────────────────────────────────
  await container.submitSimulatorAttempt.execute({ attemptId });

  // ── 9. Return results ──────────────────────────────────────────────
  return {
    ok: true,
    value: {
      attemptId,
      overallScore: grade.overallScore,
      scoreDimensions: grade.scoreDimensions,
      isPassed: grade.isPassed,
      classifications: simOutput.classifications.map((c: KeywordClassification) => ({
        keyword: c.keyword,
        groundTruth: c.groundTruth,
        userChoice: c.userChoice ?? userActions[c.keyword]!,
        isCorrect: c.isCorrect,
        roas: c.roas,
        spend: c.spend,
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

// ── Legacy re-export (for backward compatibility during migration) ────────

export type ClassifyStrRow = {
  keyword: string;
  spend: number;
  revenue: number;
  orders: number;
  action: TriageAction;
};

export type ClassifyStrInput = {
  rows: ReadonlyArray<ClassifyStrRow>;
  targetRoas: number;
};

export type ClassifyStrResult =
  | {
      ok: true;
      value: StrTriageOutput;
    }
  | {
      ok: false;
      error: { kind: "invalid_input" | "engine_error"; message: string };
    };

/**
 * @deprecated Use `strTriageAttempt()` instead. This is kept for backward
 * compatibility during the migration period.
 */
export async function classifyStr(input: ClassifyStrInput): Promise<ClassifyStrResult> {
  if (!input || !Array.isArray(input.rows) || input.rows.length === 0) {
    return { ok: false, error: { kind: "invalid_input", message: "Need ≥1 row" } };
  }
  if (typeof input.targetRoas !== "number" || input.targetRoas <= 0) {
    return { ok: false, error: { kind: "invalid_input", message: "targetRoas must be > 0" } };
  }

  const container = buildContainer();
  const sim = container.simulatorRegistry.get("str-triage");
  if (!sim) {
    return { ok: false, error: { kind: "engine_error", message: "STR Triage not registered" } };
  }

  try {
    const domainInput: StrTriageInput = {
      rows: input.rows.map((r) => ({
        keyword: r.keyword,
        spend: r.spend,
        revenue: r.revenue,
        orders: r.orders,
      })),
      targetRoas: input.targetRoas,
      userClassifications: Object.fromEntries(input.rows.map((r) => [r.keyword, r.action])),
    };
    const output = (await sim.run(domainInput)) as StrTriageOutput;
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
