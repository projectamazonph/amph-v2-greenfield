/**
 * archiveCourseAction — admin server action to archive a course.
 *
 * STORY-048a. Thin wrapper around ArchiveCourse.execute.
 *
 * Auth: requireAdmin.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { ArchiveCourse, ArchiveCourseInput, ArchiveCourseError } from "@/usecases/ArchiveCourse";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type ArchiveCourseActionResult = Result<
  { courseId: string; wasAlreadyArchived: boolean },
  ArchiveCourseError | { kind: "unauthorized" }
>;

export async function performArchiveCourse(
  container: { userRepo: UserRepository; archiveCourse: ArchiveCourse },
  input: ArchiveCourseInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<ArchiveCourseActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.archiveCourse.execute(input);
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({
    courseId: result.value.course.id,
    wasAlreadyArchived: result.value.wasAlreadyArchived,
  });
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

export async function archiveCourseAction(
  input: ArchiveCourseInput,
): Promise<ArchiveCourseActionResult> {
  const container = buildContainer();
  return performArchiveCourse(container, input, defaultGetCurrentAdminId);
}
