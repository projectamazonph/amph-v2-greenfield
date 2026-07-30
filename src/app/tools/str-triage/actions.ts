/**
 * str-triage/actions.ts — server actions for the STR Triage simulator.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 * STORY-082: Expand STR Triage classifier. `strTriageAttempt()` now
 * carries the full search-term-report schema (impressions/clicks/
 * elapsedDays/source campaign+ad-group+target+match-type), the scenario's
 * economics (per-brand-class target ROAS, confidence level, evidence
 * minimums, lexicons, existing targets), and the 7-value TriageAction
 * taxonomy. The old 4-field KeywordPerfRow / classifyStr() legacy path is
 * removed rather than kept alongside: nothing in this app depended on the
 * old narrow shape once the domain schema changed underneath it.
 *
 * Lifecycle:
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. saveSimulatorDecision — one decision per user classification (audit trail)
 *   3. StrTriageSimulator.run() — computes ground truth + dimension scores
 *   4. GradeSimulatorAttempt — persists the grade with score dimensions
 *   5. ComposeAttemptFeedback — generates actionable student feedback
 *   6. SubmitSimulatorAttempt
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type {
  StrTriageInput,
  SearchTermRow,
  ExistingTarget,
  MatchType,
  CampaignRole,
  TargetState,
} from "@/domain/simulator/str-triage/StrTriageInput";
import type {
  StrTriageOutput,
  TriageAction,
  KeywordClassification,
} from "@/domain/simulator/str-triage/StrTriageOutput";
import type { FeedbackVerdict } from "@/domain/entities/AttemptFeedback";

const DEFAULT_SCENARIO_ID = "str-triage-scenario-kitchen-products";

const TRIAGE_ACTIONS: readonly TriageAction[] = [
  "harvest_exact",
  "harvest_phrase",
  "negative_exact",
  "negative_phrase",
  "keep",
  "pause",
  "insufficient_data",
];
const MATCH_TYPES: readonly MatchType[] = ["exact", "phrase", "broad"];
const CAMPAIGN_ROLES: readonly CampaignRole[] = ["research", "performance", "defense"];
const TARGET_STATES: readonly TargetState[] = ["enabled", "paused", "archived"];

// ── Zod schema ─────────────────────────────────────────────────────────

const searchTermRowSchema = z.object({
  searchTerm: z.string().min(1),
  impressions: z.number().nonnegative(),
  clicks: z.number().nonnegative(),
  spend: z.number().nonnegative(),
  orders: z.number().nonnegative(),
  sales: z.number().nonnegative(),
  elapsedDays: z.number().nonnegative(),
  sourceCampaignId: z.string().min(1),
  sourceAdGroupId: z.string().min(1),
  sourceTarget: z.string().min(1),
  sourceMatchType: z.enum(MATCH_TYPES as [MatchType, ...MatchType[]]),
});

const existingTargetSchema = z.object({
  text: z.string().min(1),
  normalizedText: z.string().min(1),
  matchType: z.enum(MATCH_TYPES as [MatchType, ...MatchType[]]),
  campaignId: z.string().min(1),
  adGroupId: z.string().min(1),
  campaignRole: z.enum(CAMPAIGN_ROLES as [CampaignRole, ...CampaignRole[]]),
  state: z.enum(TARGET_STATES as [TargetState, ...TargetState[]]),
});

const strTriageAttemptSchema = z.object({
  rows: z.array(searchTermRowSchema).min(1),
  averageOrderValue: z.number().positive(),
  expectedCtrPct: z.number().positive(),
  expectedCvrPct: z.number().positive(),
  brandTargetRoas: z.number().positive(),
  genericTargetRoas: z.number().positive(),
  competitorTargetRoas: z.number().positive(),
  confidenceLevel: z.number().min(0).max(1),
  minElapsedDays: z.number().nonnegative(),
  minOrdersForWinner: z.number().nonnegative(),
  brandLexicon: z.array(z.string()),
  competitorBrandLexicon: z.array(z.string()),
  incompatibleAttributeLexicon: z.array(z.string()).optional(),
  existingTargets: z.array(existingTargetSchema),
  sourceCampaignRole: z.enum(CAMPAIGN_ROLES as [CampaignRole, ...CampaignRole[]]),
  userActions: z.record(z.string(), z.enum(TRIAGE_ACTIONS as [TriageAction, ...TriageAction[]])),
  scenarioId: z.string().optional(),
  mode: z.enum(["guided", "practice", "challenge", "credential", "instructor"]).optional(),
});

// ── Response types ─────────────────────────────────────────────────────

export interface StrTriageAttemptResult {
  readonly attemptId: string;
  readonly overallScore: number;
  readonly scoreDimensions: Record<string, number>;
  readonly isPassed: boolean;
  readonly classifications: readonly KeywordClassification[];
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

export type StrTriageAttemptResponse =
  | { ok: true; value: StrTriageAttemptResult }
  | { ok: false; error: { kind: "unauthorized" } }
  | {
      ok: false;
      error: {
        kind: "validation_error" | "attempt_error" | "grading_error" | "feedback_error";
        message: string;
      };
    };

// ── Action ─────────────────────────────────────────────────────────────

export async function strTriageAttempt(input: unknown): Promise<StrTriageAttemptResponse> {
  // ── 1. Validate ────────────────────────────────────────────────────
  const parseResult = strTriageAttemptSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        kind: "validation_error",
        message: parseResult.error.issues.map((i) => i.message).join("; "),
      },
    };
  }

  const { rows, userActions, scenarioId, mode, ...scenarioConfig } = parseResult.data;
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
    simulatorId: "str-triage",
    scenarioId: scenarioId ?? DEFAULT_SCENARIO_ID,
    mode: resolvedMode,
  });

  if (Result.isErr(startResult)) {
    return { ok: false, error: { kind: "attempt_error", message: startResult.error.kind } };
  }

  const attemptId = startResult.value.attemptId;

  // ── 4. Save decisions (user classifications as decisions) ──────────
  for (const [searchTerm, action] of Object.entries(userActions)) {
    const row = rows.find((r) => r.searchTerm === searchTerm);
    if (!row) continue;

    const decisionResult = await container.saveSimulatorDecision.execute({
      attemptId,
      decisionData: {
        type: "str-triage-classification",
        searchTerm,
        action,
        rowData: { spend: row.spend, sales: row.sales, orders: row.orders, clicks: row.clicks },
      },
    });
    if (Result.isErr(decisionResult)) {
      console.warn(
        `Failed to save decision for search term "${searchTerm}":`,
        decisionResult.error,
      );
    }
  }

  // ── 5. Run simulator ────────────────────────────────────────────────
  const sim = container.simulatorRegistry.get("str-triage");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "str-triage simulator not registered" },
    };
  }

  const domainInput: StrTriageInput = {
    rows: rows as readonly SearchTermRow[],
    ...scenarioConfig,
    existingTargets: scenarioConfig.existingTargets as readonly ExistingTarget[],
    userClassifications: userActions,
  };

  let simOutput: StrTriageOutput;
  try {
    simOutput = (await sim.run(domainInput)) as StrTriageOutput;
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
    return { ok: false, error: { kind: "grading_error", message: gradeResult.error.kind } };
  }

  const grade = gradeResult.value;

  // ── 7. ComposeAttemptFeedback ───────────────────────────────────────
  const feedbackResult = await container.composeAttemptFeedback.execute({ attemptId });
  if (Result.isErr(feedbackResult)) {
    return { ok: false, error: { kind: "feedback_error", message: feedbackResult.error.kind } };
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
      classifications: simOutput.classifications,
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
