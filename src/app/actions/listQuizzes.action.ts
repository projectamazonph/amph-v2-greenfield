/**
 * listQuizzesAction — admin server action to list quizzes.
 *
 * STORY-091 (US-005). Thin pass-through to AdminListQuizzes.
 * Mirrors revokeCertificate.action.ts's pure-helper + thin-shell shape
 * so the auth gate and error mapping are unit-testable.
 */
"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { AdminListQuizzes } from "@/usecases/AdminListQuizzes";
import type { Course } from "@/domain/entities/Course";
import type { Quiz } from "@/domain/entities/Quiz";

export type ListQuizzesActionInput = {
  courseId?: string;
};

export type ListQuizzesActionError =
  | { kind: "unauthorized" }
  | { kind: "db_error"; message: string }
  | { kind: "course_error"; message: string };

export type ListQuizzesActionResult = Result<
  { quizzes: readonly Quiz[]; courses: ReadonlyMap<string, Course> },
  ListQuizzesActionError
>;

export interface CurrentUserSummary {
  id: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}

export async function performListQuizzes(
  container: { userRepo: UserRepository; adminListQuizzes: AdminListQuizzes },
  input: ListQuizzesActionInput,
  getCurrentUser: (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null>,
): Promise<ListQuizzesActionResult> {
  const sessionUser = await getCurrentUser(container);
  if (!sessionUser) return Result.err({ kind: "unauthorized" });
  if (sessionUser.role !== "ADMIN") return Result.err({ kind: "unauthorized" });

  const r = await container.adminListQuizzes.execute(input);
  if (!r.ok) {
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

export async function listQuizzesAction(
  input: ListQuizzesActionInput,
): Promise<ListQuizzesActionResult> {
  const container = buildContainer();
  return performListQuizzes(container, input, defaultGetCurrentUser);
}
