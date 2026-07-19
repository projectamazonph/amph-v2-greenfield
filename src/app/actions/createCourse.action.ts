/**
 * createCourseAction — admin server action to create a new course.
 *
 * STORY-048a. Thin wrapper around CreateCourse.execute.
 *
 * Auth: requireAdmin (the action verifies the caller is an admin before
 * delegating to the use case).
 *
 * Testable pure logic: performCreateCourse (below). The action wrapper
 * wires in the session lookup + user role check.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { CreateCourse, CreateCourseInput, CreateCourseError } from "@/usecases/CreateCourse";

/** Input type the page/form provides — no actorId (the action injects it from the session). */
export type CreateCoursePageInput = Omit<CreateCourseInput, "actorId">;
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type CreateCourseActionResult = Result<
  { courseId: string },
  CreateCourseError | { kind: "unauthorized" }
>;

/**
 * Pure helper. Testable without Next runtime.
 */
export async function performCreateCourse(
  container: { userRepo: UserRepository; createCourse: CreateCourse },
  input: CreateCoursePageInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<CreateCourseActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.createCourse.execute({ ...input, actorId: adminId });
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

export async function createCourseAction(
  input: CreateCoursePageInput,
): Promise<CreateCourseActionResult> {
  const container = buildContainer();
  return performCreateCourse(container, input, defaultGetCurrentAdminId);
}
