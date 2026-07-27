/**
 * getQuizAction — admin server action to fetch a single quiz.
 *
 * STORY-091 (US-005). Thin pass-through to AdminGetQuiz.
 */
"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { AdminGetQuiz } from "@/usecases/AdminGetQuiz";
import type { Course } from "@/domain/entities/Course";
import type { Quiz } from "@/domain/entities/Quiz";

export type GetQuizActionInput = {
  quizId: string;
};

export type GetQuizActionError =
  | { kind: "unauthorized" }
  | { kind: "quiz_not_found" }
  | { kind: "course_not_found" }
  | { kind: "db_error"; message: string }
  | { kind: "course_error"; message: string };

export type GetQuizActionResult = Result<{ quiz: Quiz; course: Course }, GetQuizActionError>;

export interface CurrentUserSummary {
  id: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}

export async function performGetQuiz(
  container: { userRepo: UserRepository; adminGetQuiz: AdminGetQuiz },
  input: GetQuizActionInput,
  getCurrentUser: (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null>,
): Promise<GetQuizActionResult> {
  const sessionUser = await getCurrentUser(container);
  if (!sessionUser) return Result.err({ kind: "unauthorized" });
  if (sessionUser.role !== "ADMIN") return Result.err({ kind: "unauthorized" });

  const r = await container.adminGetQuiz.execute(input);
  if (!r.ok) {
    if (r.error.kind === "quiz_not_found") return Result.err({ kind: "quiz_not_found" });
    if (r.error.kind === "course_not_found") return Result.err({ kind: "course_not_found" });
    if (r.error.kind === "course_error") {
      return Result.err({ kind: "course_error", message: r.error.message });
    }
    return Result.err({ kind: "db_error", message: String(r.error.kind) });
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

export async function getQuizAction(input: GetQuizActionInput): Promise<GetQuizActionResult> {
  const container = buildContainer();
  return performGetQuiz(container, input, defaultGetCurrentUser);
}
