/**
 * updateCourseAction — admin server action to update a course.
 *
 * STORY-048a. Thin wrapper around UpdateCourse.execute.
 *
 * Auth: requireAdmin (the action verifies the caller is an admin before
 * delegating to the use case).
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type {
  UpdateCourse,
  UpdateCourseInput,
  UpdateCourseError,
} from "@/usecases/UpdateCourse";

/** Input type the page/form provides — no actorId (the action injects it from the session). */
export type UpdateCoursePageInput = Omit<UpdateCourseInput, "actorId">;
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type UpdateCourseActionResult = Result<
  { courseId: string },
  UpdateCourseError | { kind: "unauthorized" }
>;

export async function performUpdateCourse(
  container: { userRepo: UserRepository; updateCourse: UpdateCourse },
  input: UpdateCoursePageInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<UpdateCourseActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.updateCourse.execute({ ...input, actorId: adminId });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ courseId: result.value.course.id });
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

export async function updateCourseAction(
  input: UpdateCoursePageInput,
): Promise<UpdateCourseActionResult> {
  const container = buildContainer();
  return performUpdateCourse(container, input, defaultGetCurrentAdminId);
}
