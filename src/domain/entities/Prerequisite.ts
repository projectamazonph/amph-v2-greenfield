/**
 * Prerequisite — explicit course-gating rule (P1-01).
 *
 * A row says: "courseId requires requiresCourseId". When requiresLessonId
 * is set, only that single lesson must be complete; otherwise the whole
 * required course must be complete (every curriculum lesson id present in
 * the student's completed set).
 *
 * This is separate from the implicit sequential lesson order in
 * `GuidedFlow`, which stays untouched. Satisfaction helpers are pure set
 * membership so the use-case layer can compute completion from
 * enrollments without leaking persistence into the domain.
 */

import { Result } from "@/domain/shared/Result";

export interface Prerequisite {
  readonly id: string;
  readonly courseId: string;
  readonly requiresCourseId: string;
  readonly requiresLessonId: string | null;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
  readonly createdById: string;
  readonly updatedById: string;
}

export type CreatePrerequisiteError =
  | { kind: "invalid_course_id" }
  | { kind: "invalid_requires_course_id" }
  | { kind: "self_prerequisite" };

export function createPrerequisite(params: {
  id: string;
  courseId: string;
  requiresCourseId: string;
  requiresLessonId: string | null;
  createdById: string;
  createdAt?: Date;
}): Result<Prerequisite, CreatePrerequisiteError> {
  if (!params.courseId.trim()) {
    return Result.err({ kind: "invalid_course_id" });
  }
  if (!params.requiresCourseId.trim()) {
    return Result.err({ kind: "invalid_requires_course_id" });
  }
  if (params.courseId === params.requiresCourseId) {
    return Result.err({ kind: "self_prerequisite" });
  }
  return Result.ok({
    id: params.id,
    courseId: params.courseId,
    requiresCourseId: params.requiresCourseId,
    requiresLessonId: params.requiresLessonId,
    createdAt: params.createdAt ?? new Date(),
    deletedAt: null,
    createdById: params.createdById,
    updatedById: params.createdById,
  });
}

/**
 * A lesson-scoped rule checks the completed-lesson set; a course-scoped
 * rule checks the completed-course set. Both are plain membership tests.
 */
export function isPrerequisiteSatisfied(
  prereq: Prerequisite,
  completedCourseIds: ReadonlySet<string>,
  completedLessonIds: ReadonlySet<string>,
): boolean {
  if (prereq.requiresLessonId !== null) {
    return completedLessonIds.has(prereq.requiresLessonId);
  }
  return completedCourseIds.has(prereq.requiresCourseId);
}

/**
 * A course counts as complete when every curriculum lesson id appears in
 * the student's completed set. An empty curriculum never counts, so a
 * misconfigured course cannot silently unlock its dependents.
 */
export function isCourseComplete(
  allLessonIds: readonly string[],
  completedLessonIds: readonly string[],
): boolean {
  if (allLessonIds.length === 0) {
    return false;
  }
  const completed = new Set(completedLessonIds);
  return allLessonIds.every((id) => completed.has(id));
}
