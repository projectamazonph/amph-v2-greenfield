/**
 * Lesson — a course lesson. Belongs to a Module. Has a `type` that
 * determines the shape of `content`.
 *
 * STORY-048c. The Lesson replaces the embedded `Lesson` inside
 * `Course.curriculum` for the admin surface. The catalog migration
 * is a follow-up.
 *
 * Domain rules:
 * - title must be non-empty after trim
 * - type must be one of "VIDEO" | "TEXT" | "QUIZ"
 * - content shape is validated per type:
 *     VIDEO: { durationMinutes: number (>0) }
 *     TEXT:  { body: string (non-empty) }
 *     QUIZ:  { questions: Question[] (>=1) }
 * - displayOrder is a positive integer (1-indexed per module)
 * - moduleId and id must be non-empty
 */

import { Result } from "@/domain/shared/Result";

export type LessonType = "VIDEO" | "TEXT" | "QUIZ";

export interface VideoContent {
  readonly durationMinutes: number;
}

export interface TextContent {
  readonly body: string;
}

export interface QuizQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctOptionIndex: number;
}

export interface QuizContent {
  readonly questions: readonly QuizQuestion[];
}

export type LessonContent = VideoContent | TextContent | QuizContent;

export interface Lesson {
  readonly id: string;
  readonly moduleId: string;
  readonly title: string;
  readonly type: LessonType;
  readonly content: LessonContent;
  readonly displayOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type LessonError =
  | { kind: "invalid_input"; message: string };

// ── Content validation ────────────────────────────────────────────

function validateVideoContent(
  c: unknown,
): Result<VideoContent, LessonError> {
  if (typeof c !== "object" || c === null) {
    return Result.err({ kind: "invalid_input", message: "VIDEO content must be an object" });
  }
  const obj = c as Record<string, unknown>;
  const dur = obj.durationMinutes;
  if (typeof dur !== "number" || !Number.isFinite(dur) || dur <= 0) {
    return Result.err({
      kind: "invalid_input",
      message: "VIDEO content must have a positive durationMinutes",
    });
  }
  return Result.ok({ durationMinutes: dur });
}

function validateTextContent(
  c: unknown,
): Result<TextContent, LessonError> {
  if (typeof c !== "object" || c === null) {
    return Result.err({ kind: "invalid_input", message: "TEXT content must be an object" });
  }
  const obj = c as Record<string, unknown>;
  const body = obj.body;
  if (typeof body !== "string" || body.trim().length === 0) {
    return Result.err({
      kind: "invalid_input",
      message: "TEXT content must have a non-empty body",
    });
  }
  return Result.ok({ body });
}

function validateQuizContent(
  c: unknown,
): Result<QuizContent, LessonError> {
  if (typeof c !== "object" || c === null) {
    return Result.err({ kind: "invalid_input", message: "QUIZ content must be an object" });
  }
  const obj = c as Record<string, unknown>;
  const qs = obj.questions;
  if (!Array.isArray(qs) || qs.length === 0) {
    return Result.err({
      kind: "invalid_input",
      message: "QUIZ content must have at least one question",
    });
  }
  const out: QuizQuestion[] = [];
  for (const q of qs) {
    if (typeof q !== "object" || q === null) {
      return Result.err({ kind: "invalid_input", message: "QUIZ question must be an object" });
    }
    const qo = q as Record<string, unknown>;
    if (typeof qo.id !== "string" || !qo.id) {
      return Result.err({ kind: "invalid_input", message: "QUIZ question must have an id" });
    }
    if (typeof qo.prompt !== "string" || !qo.prompt.trim()) {
      return Result.err({ kind: "invalid_input", message: "QUIZ question must have a prompt" });
    }
    if (!Array.isArray(qo.options) || qo.options.length < 2) {
      return Result.err({
        kind: "invalid_input",
        message: "QUIZ question must have at least 2 options",
      });
    }
    if (
      typeof qo.correctOptionIndex !== "number" ||
      !Number.isInteger(qo.correctOptionIndex) ||
      qo.correctOptionIndex < 0 ||
      qo.correctOptionIndex >= qo.options.length
    ) {
      return Result.err({
        kind: "invalid_input",
        message: "QUIZ question must have a valid correctOptionIndex",
      });
    }
    out.push({
      id: qo.id,
      prompt: qo.prompt,
      options: qo.options.map((o) => String(o)),
      correctOptionIndex: qo.correctOptionIndex,
    });
  }
  return Result.ok({ questions: out });
}

export function validateLessonContent(
  type: LessonType,
  content: unknown,
): Result<LessonContent, LessonError> {
  switch (type) {
    case "VIDEO":
      return validateVideoContent(content);
    case "TEXT":
      return validateTextContent(content);
    case "QUIZ":
      return validateQuizContent(content);
  }
}

// ── Factory ────────────────────────────────────────────────────────

export interface CreateLessonParams {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  content: unknown;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export function createLesson(
  params: CreateLessonParams,
): Result<Lesson, LessonError> {
  if (!params.id.trim()) {
    return Result.err({ kind: "invalid_input", message: "Lesson id is required" });
  }
  if (!params.moduleId.trim()) {
    return Result.err({ kind: "invalid_input", message: "Module id is required" });
  }
  if (!params.title.trim()) {
    return Result.err({ kind: "invalid_input", message: "Lesson title is required" });
  }
  if (!Number.isInteger(params.displayOrder) || params.displayOrder < 1) {
    return Result.err({
      kind: "invalid_input",
      message: "displayOrder must be a positive integer",
    });
  }
  const contentResult = validateLessonContent(params.type, params.content);
  if (!contentResult.ok) {
    return Result.err(contentResult.error);
  }
  const now = new Date();
  return Result.ok({
    id: params.id.trim(),
    moduleId: params.moduleId.trim(),
    title: params.title.trim(),
    type: params.type,
    content: contentResult.value,
    displayOrder: params.displayOrder,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  });
}

// ── Update factory ─────────────────────────────────────────────────

export interface UpdateLessonPatch {
  title?: string;
  type?: LessonType;
  content?: unknown;
}

export function updateLesson(
  lesson: Lesson,
  patch: UpdateLessonPatch,
): Result<Lesson, LessonError> {
  const nextType = patch.type ?? lesson.type;
  const nextContent = patch.content ?? lesson.content;
  return createLesson({
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: patch.title ?? lesson.title,
    type: nextType,
    content: nextContent,
    displayOrder: lesson.displayOrder,
    createdAt: lesson.createdAt,
    updatedAt: new Date(),
  });
}
