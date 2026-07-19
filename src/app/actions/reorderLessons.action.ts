/**
 * reorderLessonsAction — admin server action to atomically reorder a module's lessons.
 *
 * STORY-048c.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { ReorderLessons, ReorderLessonsInput } from "@/usecases/ReorderLessons";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { LessonError } from "@/ports/repositories/ILessonRepository";

export type ReorderLessonsActionResult = Result<
  { lessons: readonly { id: string }[] },
  LessonError | { kind: "unauthorized" }
>;

export async function performReorderLessons(
  container: { userRepo: UserRepository; reorderLessons: ReorderLessons },
  input: ReorderLessonsInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<ReorderLessonsActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.reorderLessons.execute(input);
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ lessons: result.value.lessons.map((l) => ({ id: l.id })) });
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

export async function reorderLessonsAction(
  input: ReorderLessonsInput,
): Promise<ReorderLessonsActionResult> {
  const container = buildContainer();
  return performReorderLessons(container, input, defaultGetCurrentAdminId);
}
