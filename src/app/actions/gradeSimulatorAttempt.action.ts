/**
 * gradeSimulatorAttempt action -- server action for scoring a submitted attempt.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { GradeSimulatorAttempt } from "@/usecases/GradeSimulatorAttempt";
import { getContainer } from "@/composition/container";

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
  const container = getContainer();
  const useCase = container.gradeSimulatorAttempt;

  const attemptId = formData.get("attemptId");
  const scoreDimensionsRaw = formData.get("scoreDimensions");

  if (typeof attemptId !== "string" || !attemptId.trim()) {
    return { error: "validation_error: attemptId is required" };
  }
  if (typeof scoreDimensionsRaw !== "string" || !scoreDimensionsRaw.trim()) {
    return { error: "validation_error: scoreDimensions is required" };
  }

  let scoreDimensions: Record<string, number>;
  try {
    scoreDimensions = JSON.parse(scoreDimensionsRaw) as Record<string, number>;
  } catch {
    return { error: "validation_error: scoreDimensions must be valid JSON" };
  }

  const result = await useCase.execute({ attemptId, scoreDimensions });

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
