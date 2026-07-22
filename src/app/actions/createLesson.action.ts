/**
 * createLessonAction — admin server action to create a new lesson.
 *
 * STORY-048c. The action takes a `contentJson` string from the form
 * and parses it (the form is plain HTML; the JSON shape is enforced
 * by the use case + entity factory).
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { CreateLesson, CreateLessonInput, CreateLessonError } from "@/usecases/CreateLesson";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export interface CreateLessonFormInput {
  moduleId: string;
  title: string;
  type: "VIDEO" | "TEXT" | "QUIZ";
  contentJson: string;
}

export type CreateLessonActionResult = Result<
  { lessonId: string },
  CreateLessonError | { kind: "unauthorized" } | { kind: "invalid_content_json"; message: string }
>;

function parseContent(
  type: "VIDEO" | "TEXT" | "QUIZ",
  json: string,
): Result<unknown, { kind: "invalid_content_json"; message: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid JSON";
    return Result.err({ kind: "invalid_content_json", message: msg });
  }
  // Convert based on type: the form sends durationMinutes as a string
  // for VIDEO, or a JSON array for QUIZ questions.
  if (type === "VIDEO" && parsed && typeof parsed === "object" && "durationMinutes" in parsed) {
    const obj = parsed as Record<string, unknown>;
    const n = Number(obj.durationMinutes);
    if (Number.isFinite(n)) {
      parsed = { ...obj, durationMinutes: n };
    }
  }
  return Result.ok(parsed);
}

export async function performCreateLesson(
  container: { userRepo: UserRepository; createLesson: CreateLesson },
  input: CreateLessonFormInput,
  getCurrentAdminId: (container: { userRepo: UserRepository }) => Promise<string | null>,
): Promise<CreateLessonActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const parseResult = parseContent(input.type, input.contentJson);
  if (!parseResult.ok) {
    return Result.err(parseResult.error);
  }

  const result = await container.createLesson.execute({
    moduleId: input.moduleId,
    title: input.title,
    type: input.type,
    content: parseResult.value as never,
    actorId: adminId,
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

export async function createLessonAction(
  input: CreateLessonFormInput,
): Promise<CreateLessonActionResult> {
  const container = buildContainer();
  return performCreateLesson(container, input, defaultGetCurrentAdminId);
}
