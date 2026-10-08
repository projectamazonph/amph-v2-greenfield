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
 * STORY-085: the scenario's rows/economics/lexicons/existingTargets are no
 * longer accepted from the client — the client used to echo the entire
 * scenario object back on submit, so a forged economics payload could game
 * the grade. `strTriageAttempt()` now resolves the *currently published*
 * str-triage scenario server-side and uses its content; only
 * `userActions` (the student's classifications) and `mode` are trusted
 * from the client. This also means publishing a new scenario version
 * through the admin UI takes effect immediately.
 *
 * STORY-088: a passing Challenge-mode attempt awards a one-time
 * `XPService.SIMULATOR_CHALLENGE_PASSED_XP` bonus.
 *
 * Lifecycle (mirrors keyword-research/actions.ts's ordering):
 *   1. StartSimulatorAttempt — creates the attempt record
 *   2. saveSimulatorDecision — one decision per user classification (audit trail)
 *   3. StrTriageSimulator.run() — computes ground truth + dimension scores.
 *      Runs before submission so a registry-lookup failure or a sim.run()
 *      throw returns early without ever marking the attempt "submitted"
 *      (an attempt stuck submitted-but-ungraded would be unrecoverable
 *      orphaned state).
 *   4. SubmitSimulatorAttempt — transitions in_progress -> submitted
 *      (must run before grading: GradeSimulatorAttempt requires status
 *      "submitted", and submission itself requires at least one decision
 *      to already be saved, which step 2 did)
 *   5. GradeSimulatorAttempt — persists the grade with score dimensions
 *   6. ComposeAttemptFeedback — generates actionable student feedback
 */

"use server";

import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { AppContainer } from "@/composition/container";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type {
  StrTriageInput,
  SearchTermRow,
  ExistingTarget,
} from "@/domain/simulator/str-triage/StrTriageInput";
import type {
  StrTriageOutput,
  TriageAction,
  KeywordClassification,
} from "@/domain/simulator/str-triage/StrTriageOutput";
import type { FeedbackVerdict } from "@/domain/entities/AttemptFeedback";
import { XPService } from "@/domain/services/XPService";
import { hasEverPassedSimulatorInMode } from "@/usecases/CheckChallengeModeUnlocked";
import { strTriageScenarioContentSchema } from "./scenarioContent";

const TRIAGE_ACTIONS: readonly TriageAction[] = [
  "harvest_exact",
  "harvest_phrase",
  "negative_exact",
  "negative_phrase",
  "keep",
  "pause",
  "insufficient_data",
];

async function resolvePublishedScenario(container: AppContainer) {
  const result = await container.scenarioRepo.findPublished("str-triage");
  if (!result.ok || !result.value) {
    return null;
  }
  const parsed = strTriageScenarioContentSchema.safeParse(result.value.inputSchema);
  if (!parsed.success) {
    return null;
  }
  return { scenarioId: result.value.id, content: parsed.data };
}

// ── Zod schema ─────────────────────────────────────────────────────────

const strTriageAttemptSchema = z.object({
  userActions: z.record(z.string(), z.enum(TRIAGE_ACTIONS as [TriageAction, ...TriageAction[]])),
  mode: z.enum(["guided", "practice", "challenge", "credential", "instructor"]).optional(),
});

// ── Response types ─────────────────────────────────────────────────────

export interface StrTriageAttemptResult {
  readonly attemptId: string;
  readonly overallScore: number;
  readonly scoreDimensions: Record<string, number>;
  readonly isPassed: boolean;
  readonly classifications: readonly KeywordClassification[];
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

  const { userActions, mode } = parseResult.data;
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
      error: { kind: "attempt_error", message: "No published str-triage scenario found" },
    };
  }

  // ── 4. StartSimulatorAttempt ────────────────────────────────────────
  const startResult = await container.startSimulatorAttempt.execute({
    userId,
    simulatorId: "str-triage",
    scenarioId: scenario.scenarioId,
    mode: resolvedMode,
  });

  if (Result.isErr(startResult)) {
    return { ok: false, error: { kind: "attempt_error", message: startResult.error.kind } };
  }

  const attemptId = startResult.value.attemptId;

  // ── 5. Save decisions (user classifications as decisions) ──────────
  for (const [searchTerm, action] of Object.entries(userActions)) {
    const row = scenario.content.rows.find((r) => r.searchTerm === searchTerm);
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

  // ── 6. Run simulator ────────────────────────────────────────────────
  // Runs before SubmitSimulatorAttempt so a registry-lookup failure or a
  // sim.run() throw returns early without ever marking the attempt
  // "submitted" — an attempt stuck submitted-but-ungraded is orphaned
  // state with no way to grade or retry it under this scenario.
  const sim = container.simulatorRegistry.get("str-triage");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "attempt_error", message: "str-triage simulator not registered" },
    };
  }

  const domainInput: StrTriageInput = {
    rows: scenario.content.rows as readonly SearchTermRow[],
    averageOrderValue: scenario.content.averageOrderValue,
    expectedCtrPct: scenario.content.expectedCtrPct,
    expectedCvrPct: scenario.content.expectedCvrPct,
    brandTargetRoas: scenario.content.brandTargetRoas,
    genericTargetRoas: scenario.content.genericTargetRoas,
    competitorTargetRoas: scenario.content.competitorTargetRoas,
    confidenceLevel: scenario.content.confidenceLevel,
    minElapsedDays: scenario.content.minElapsedDays,
    minOrdersForWinner: scenario.content.minOrdersForWinner,
    brandLexicon: scenario.content.brandLexicon,
    competitorBrandLexicon: scenario.content.competitorBrandLexicon,
    incompatibleAttributeLexicon: scenario.content.incompatibleAttributeLexicon,
    existingTargets: scenario.content.existingTargets as readonly ExistingTarget[],
    sourceCampaignRole: scenario.content.sourceCampaignRole,
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

  // ── 7. SubmitSimulatorAttempt ─────────────────────────────────────────
  // GradeSimulatorAttempt requires status="submitted"; must run before
  // grading, not before the simulator (it also requires at least one
  // decision saved, which step 4 above already did).
  const submitResult = await container.submitSimulatorAttempt.execute({ attemptId });
  if (Result.isErr(submitResult)) {
    return { ok: false, error: { kind: "attempt_error", message: submitResult.error.kind } };
  }

  // ── 8. GradeSimulatorAttempt ────────────────────────────────────────
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

  // ── 9. ComposeAttemptFeedback ───────────────────────────────────────
  const feedbackResult = await container.composeAttemptFeedback.execute({ attemptId });
  if (Result.isErr(feedbackResult)) {
    return { ok: false, error: { kind: "feedback_error", message: feedbackResult.error.kind } };
  }
  const feedback = feedbackResult.value.feedback;

  // ── 10. Award Challenge-mode XP (once per simulator, first pass only) ─
  let xpAwarded: number | null = null;
  if (resolvedMode === "challenge" && feedback.passed) {
    const alreadyEarnedResult = await hasEverPassedSimulatorInMode(
      { attemptRepo: container.simulatorAttemptRepo, scorePolicyRepo: container.scorePolicyRepo },
      { userId, simulatorId: "str-triage", mode: "challenge", excludeAttemptId: attemptId },
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

  // ── 11. Return results ──────────────────────────────────────────────
  return {
    ok: true,
    value: {
      attemptId,
      overallScore: grade.overallScore,
      scoreDimensions: grade.scoreDimensions,
      isPassed: grade.isPassed,
      classifications: simOutput.classifications,
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
