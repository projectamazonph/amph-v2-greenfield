/**
 * deleteLessonAction — admin server action to delete a lesson.
 *
 * STORY-048c.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { DeleteLesson, DeleteLessonInput, DeleteLessonError } from "@/usecases/DeleteLesson";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type DeleteLessonActionResult = Result<
  { deleted: true },
  DeleteLessonError | { kind: "unauthorized" }
>;

export async function performDeleteLesson(
  container: { userRepo: UserRepository; deleteLesson: DeleteLesson },
  input: DeleteLessonInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<DeleteLessonActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.deleteLesson.execute(input);
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ deleted: true });
}

async function defaultGetCurrentAdminId(container: {
  userRepo: UserRepository;
}): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) return null;
  if (userResult.value.role !== "ADMIN") return null;
  return userId;
}

export async function deleteLessonAction(
  input: DeleteLessonInput,
): Promise<DeleteLessonActionResult> {
  const container = buildContainer();
  return performDeleteLesson(container, input, defaultGetCurrentAdminId);
}
