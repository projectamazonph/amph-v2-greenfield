/**
 * updateLessonAction — admin server action to update a lesson.
 *
 * STORY-048c.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UpdateLesson, UpdateLessonInput, UpdateLessonError } from "@/usecases/UpdateLesson";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export interface UpdateLessonFormInput {
  lessonId: string;
  title?: string;
  type?: "VIDEO" | "TEXT" | "QUIZ";
  contentJson?: string;
}

export type UpdateLessonActionResult = Result<
  { lessonId: string },
  UpdateLessonError
  | { kind: "unauthorized" }
  | { kind: "invalid_content_json"; message: string }
>;

export async function performUpdateLesson(
  container: { userRepo: UserRepository; updateLesson: UpdateLesson },
  input: UpdateLessonFormInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<UpdateLessonActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const patch: UpdateLessonInput["patch"] = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.type !== undefined) patch.type = input.type;
  if (input.contentJson !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.contentJson);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid JSON";
      return Result.err({ kind: "invalid_content_json", message: msg });
    }
    if (input.type === "VIDEO" && parsed && typeof parsed === "object" && "durationMinutes" in parsed) {
      const obj = parsed as Record<string, unknown>;
      const n = Number(obj.durationMinutes);
      if (Number.isFinite(n)) {
        parsed = { ...obj, durationMinutes: n };
      }
    }
    patch.content = parsed;
  }

  const result = await container.updateLesson.execute({
    lessonId: input.lessonId,
    patch,
  });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ lessonId: result.value.lesson.id });
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

export async function updateLessonAction(
  input: UpdateLessonFormInput,
): Promise<UpdateLessonActionResult> {
  const container = buildContainer();
  return performUpdateLesson(container, input, defaultGetCurrentAdminId);
}
