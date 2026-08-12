/**
 * composeAttemptFeedback action -- server action for generating feedback for a graded attempt.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";

export interface ComposeAttemptFeedbackResponse {
  attemptId?: string;
  userId?: string;
  simulatorId?: string;
  scenarioId?: string;
  difficulty?: string;
  mode?: string;
  overallScore?: number;
  passed?: boolean;
  overallComment?: string;
  remediationLinks?: readonly string[];
  dimensionFeedback?: readonly {
    dimension: string;
    verdict: string;
    score: number;
    comment: string;
    recommendation: string;
  }[];
  completedAt?: string;
  error?: string;
}

export async function composeAttemptFeedbackAction(
  _prevState: unknown,
  formData: FormData,
): Promise<ComposeAttemptFeedbackResponse> {
  const attemptId = formData.get("attemptId");

  if (typeof attemptId !== "string" || !attemptId.trim()) {
    return { error: "validation_error: attemptId is required" };
  }

  const user = await getSessionUser();
  if (!user) return { error: "unauthenticated" };

  const container = buildContainer();
  const attemptResult = await container.simulatorAttemptRepo.findByAttemptId(attemptId);
  if (!attemptResult.ok) return { error: "internal_error" };
  if (attemptResult.value !== null && attemptResult.value.userId !== user.id) {
    return { error: "forbidden" };
  }

  const result = await container.composeAttemptFeedback.execute({ attemptId });

  if (Result.isErr(result)) {
    const err = result.error as { kind: string };
    return { error: err.kind };
  }

  const { feedback } = result.value;
  return {
    attemptId: feedback.attemptId,
    userId: feedback.userId,
    simulatorId: feedback.simulatorId,
    scenarioId: feedback.scenarioId,
    difficulty: feedback.difficulty,
    mode: feedback.mode,
    overallScore: feedback.overallScore,
    passed: feedback.passed,
    overallComment: feedback.overallComment,
    remediationLinks: feedback.remediationLinks,
    dimensionFeedback: feedback.dimensionFeedback.map(
      (dim: {
        dimension: string;
        verdict: string;
        score: number;
        comment: string;
        recommendation: string;
      }) => ({
        dimension: dim.dimension,
        verdict: dim.verdict,
        score: dim.score,
        comment: dim.comment,
        recommendation: dim.recommendation,
      }),
    ),
    completedAt: feedback.completedAt.toISOString(),
  };
}
