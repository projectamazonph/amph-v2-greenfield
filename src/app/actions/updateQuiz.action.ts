/**
 * updateQuizAction — admin server action to update an existing quiz.
 *
 * STORY-091 (US-005). Thin pass-through to AdminUpdateQuiz.
 */
"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { AdminUpdateQuiz } from "@/usecases/AdminUpdateQuiz";
import type { CreateQuizQuestionParams } from "@/domain/entities/Quiz";

export type UpdateQuizActionInput = {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  questions: CreateQuizQuestionParams[];
};

export type UpdateQuizActionError =
  | { kind: "unauthorized" }
  | { kind: "not_found" }
  | { kind: "invalid_id" }
  | { kind: "invalid_course_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_passing_score" }
  | { kind: "no_questions" }
  | { kind: "question_missing_correct_option" }
  | { kind: "question_multiple_correct_options" }
  | { kind: "db_error"; message: string };

export type UpdateQuizActionResult = Result<{ quizId: string }, UpdateQuizActionError>;

export interface CurrentUserSummary {
  id: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}

export async function performUpdateQuiz(
  container: { userRepo: UserRepository; adminUpdateQuiz: AdminUpdateQuiz },
  input: UpdateQuizActionInput,
  getCurrentUser: (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null>,
): Promise<UpdateQuizActionResult> {
  const sessionUser = await getCurrentUser(container);
  if (!sessionUser) return Result.err({ kind: "unauthorized" });
  if (sessionUser.role !== "ADMIN") return Result.err({ kind: "unauthorized" });

  const r = await container.adminUpdateQuiz.execute({
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

export async function updateQuizAction(
  input: UpdateQuizActionInput,
): Promise<UpdateQuizActionResult> {
  const container = buildContainer();
  return performUpdateQuiz(container, input, defaultGetCurrentUser);
}
