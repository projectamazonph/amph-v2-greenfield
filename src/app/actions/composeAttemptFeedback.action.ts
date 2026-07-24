/**
 * composeAttemptFeedback action -- server action for generating feedback for a graded attempt.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { ComposeAttemptFeedback } from "@/usecases/ComposeAttemptFeedback";
import { getContainer } from "@/composition/container";

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
  const container = getContainer();
  const useCase = container.composeAttemptFeedback;

  const attemptId = formData.get("attemptId");

  if (typeof attemptId !== "string" || !attemptId.trim()) {
    return { error: "validation_error: attemptId is required" };
  }

  const result = await useCase.execute({ attemptId });

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
