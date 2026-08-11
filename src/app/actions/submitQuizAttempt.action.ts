"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";

const inputSchema = z.object({
  quizId: z.string().min(1).max(128),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(128),
        selectedOptionId: z.string().min(1).max(128),
      }),
    )
    .min(1)
    .max(100),
});

export type SubmitQuizAttemptInput = z.infer<typeof inputSchema>;

interface ReviewItem {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  explanation: string;
}

export type SubmitQuizAttemptResult =
  | {
      ok: true;
      score: number | null;
      passed: boolean | null;
      xpAwarded: number;
      correctCount: number | null;
      totalQuestions: number | null;
      review: readonly ReviewItem[] | null;
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "invalid_submission"
        | "access_denied"
        | "quiz_not_found"
        | "invalid_answer"
        | "submission_failed";
    };

export async function submitQuizAttemptAction(
  rawInput: SubmitQuizAttemptInput,
): Promise<SubmitQuizAttemptResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "invalid_submission" };
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: "not_authenticated" };
  }

  const result = await buildContainer().recordQuizAttempt.execute({
    userId,
    quizId: parsed.data.quizId,
    answers: parsed.data.answers,
  });
  if (!result.ok) {
    if (
      result.error.kind === "access_denied" ||
      result.error.kind === "quiz_not_found" ||
      result.error.kind === "invalid_answer"
    ) {
      return { ok: false, error: result.error.kind };
    }
    return { ok: false, error: "submission_failed" };
  }

  revalidatePath("/dashboard");
  return {
    ok: true,
    score: result.value.score,
    passed: result.value.passed,
    xpAwarded: result.value.xpAwarded,
    correctCount: result.value.correctCount,
    totalQuestions: result.value.totalQuestions,
    review: result.value.review,
  };
}
