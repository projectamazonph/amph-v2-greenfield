/**
 * deleteQuizAction — admin server action to delete a quiz.
 *
 * STORY-091 (US-005). Thin pass-through to AdminDeleteQuiz. Surfaces
 * the has_attempts error with the attempt count so the admin UI can
 * show "this quiz has N attempts; reassign or remove them first".
 */
"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { AdminDeleteQuiz } from "@/usecases/AdminDeleteQuiz";

export type DeleteQuizActionInput = {
  quizId: string;
};

export type DeleteQuizActionError =
  | { kind: "unauthorized" }
  | { kind: "not_found" }
  | { kind: "has_attempts"; attemptCount: number }
  | { kind: "db_error"; message: string };

export type DeleteQuizActionResult = Result<{ deleted: true }, DeleteQuizActionError>;

export interface CurrentUserSummary {
  id: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}

export async function performDeleteQuiz(
  container: { userRepo: UserRepository; adminDeleteQuiz: AdminDeleteQuiz },
  input: DeleteQuizActionInput,
  getCurrentUser: (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null>,
): Promise<DeleteQuizActionResult> {
  const sessionUser = await getCurrentUser(container);
  if (!sessionUser) return Result.err({ kind: "unauthorized" });
  if (sessionUser.role !== "ADMIN") return Result.err({ kind: "unauthorized" });

  const r = await container.adminDeleteQuiz.execute({
    ...input,
    actorId: sessionUser.id,
  });
  if (!r.ok) {
    return Result.err(r.error);
  }
  return Result.ok(r.value);
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

export async function deleteQuizAction(
  input: DeleteQuizActionInput,
): Promise<DeleteQuizActionResult> {
  const container = buildContainer();
  return performDeleteQuiz(container, input, defaultGetCurrentUser);
}
