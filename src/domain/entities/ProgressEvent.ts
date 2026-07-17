/**
 * ProgressEvent — audit log for student progress events.
 *
 * STORY-027: MarkLessonComplete use case + ProgressService + ProgressEvent log.
 *
 * Immutable domain object. Created by `createProgressEvent`.
 */

import { Result } from "@/domain/shared/Result";

export type ProgressEventType =
  | "lesson_completed"
  | "course_started"
  | "course_completed";

export interface ProgressEvent {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly lessonId: string | null;
  readonly type: ProgressEventType;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
}

export type CreateProgressEventError =
  | { kind: "invalid_id" }
  | { kind: "invalid_user_id" }
  | { kind: "invalid_course_id" }
  | { kind: "invalid_event_type" };

/**
 * Factory for creating a ProgressEvent domain object.
 */
export function createProgressEvent(params: {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string | null;
  type: ProgressEventType;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}): Result<ProgressEvent, CreateProgressEventError> {
  if (!params.id.trim()) return Result.err({ kind: "invalid_id" });
  if (!params.userId.trim()) return Result.err({ kind: "invalid_user_id" });
  if (!params.courseId.trim()) return Result.err({ kind: "invalid_course_id" });

  return Result.ok({
    id: params.id,
    userId: params.userId,
    courseId: params.courseId,
    lessonId: params.lessonId ?? null,
    type: params.type,
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
    createdAt: params.createdAt ?? new Date(),
  });
}
