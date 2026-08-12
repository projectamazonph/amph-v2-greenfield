/**
 * gradeSimulatorAttempt action -- server action for scoring a submitted attempt.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";

export interface GradeSimulatorAttemptResponse {
  attemptId?: string;
  overallScore?: number;
  scoreDimensions?: Record<string, number>;
  isPassed?: boolean;
  gradedAt?: string;
  error?: string;
}

export async function gradeSimulatorAttemptAction(
  _prevState: unknown,
  formData: FormData,
): Promise<GradeSimulatorAttemptResponse> {
  const attemptId = formData.get("attemptId");
  const scoreDimensionsRaw = formData.get("scoreDimensions");

  if (typeof attemptId !== "string" || !attemptId.trim()) {
    return { error: "validation_error: attemptId is required" };
  }
  if (typeof scoreDimensionsRaw !== "string" || !scoreDimensionsRaw.trim()) {
    return { error: "validation_error: scoreDimensions is required" };
  }

  const user = await getSessionUser();
  if (!user) return { error: "unauthenticated" };

  const container = buildContainer();
  const attemptResult = await container.simulatorAttemptRepo.findByAttemptId(attemptId);
  if (!attemptResult.ok) return { error: "internal_error" };
  if (attemptResult.value !== null && attemptResult.value.userId !== user.id) {
    return { error: "forbidden" };
  }

  let scoreDimensions: Record<string, number>;
  try {
    scoreDimensions = JSON.parse(scoreDimensionsRaw) as Record<string, number>;
  } catch {
    return { error: "validation_error: scoreDimensions must be valid JSON" };
  }

  const result = await container.gradeSimulatorAttempt.execute({ attemptId, scoreDimensions });

  if (Result.isErr(result)) {
    const err = result.error as { kind: string };
    return { error: err.kind };
  }

  const value = result.value;
  return {
    attemptId: value.attemptId,
    overallScore: value.overallScore,
    scoreDimensions: value.scoreDimensions,
    isPassed: value.isPassed,
    gradedAt: value.gradedAt.toISOString(),
  };
}
