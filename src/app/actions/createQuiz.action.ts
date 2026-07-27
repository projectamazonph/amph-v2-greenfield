/**
 * createQuizAction — admin server action to create a new quiz.
 *
 * STORY-091 (US-005). Thin pass-through to AdminCreateQuiz.
 * Maps every CreateQuizError kind to its own action error so the
 * admin form can surface validation errors per-field.
 */
"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { AdminCreateQuiz } from "@/usecases/AdminCreateQuiz";
import type { CreateQuizQuestionParams } from "@/domain/entities/Quiz";

export type CreateQuizActionInput = {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  questions: CreateQuizQuestionParams[];
};

export type CreateQuizActionError =
  | { kind: "unauthorized" }
  | { kind: "invalid_id" }
  | { kind: "invalid_course_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_passing_score" }
  | { kind: "no_questions" }
  | { kind: "question_missing_correct_option" }
  | { kind: "question_multiple_correct_options" }
  | { kind: "db_error"; message: string };

export type CreateQuizActionResult = Result<{ quizId: string }, CreateQuizActionError>;

export interface CurrentUserSummary {
  id: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}

export async function performCreateQuiz(
  container: { userRepo: UserRepository; adminCreateQuiz: AdminCreateQuiz },
  input: CreateQuizActionInput,
  getCurrentUser: (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null>,
): Promise<CreateQuizActionResult> {
  const sessionUser = await getCurrentUser(container);
  if (!sessionUser) return Result.err({ kind: "unauthorized" });
  if (sessionUser.role !== "ADMIN") return Result.err({ kind: "unauthorized" });

  const r = await container.adminCreateQuiz.execute({
    ...input,
    actorId: sessionUser.id,
  });
  if (!r.ok) {
    return Result.err(r.error);
  }
  return Result.ok({ quizId: r.value.quiz.id });
}

async function defaultGetCurrentUser(container: {
  userRepo: UserRepository;
}): Promise<CurrentUserSummary | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) return null;
  return { id: userResult.value.id, role: userResult.value.role };
}

export async function createQuizAction(
  input: CreateQuizActionInput,
): Promise<CreateQuizActionResult> {
  const container = buildContainer();
  return performCreateQuiz(container, input, defaultGetCurrentUser);
}
