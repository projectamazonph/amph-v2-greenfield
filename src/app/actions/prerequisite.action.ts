/**
 * prerequisite.action.ts — P1-01 (PR-C slice 1).
 *
 * Server action wrappers around `SetCoursePrerequisite` and
 * `RemoveCoursePrerequisite`. Resolve the calling admin via
 * `requireAdmin` and forward the input.
 *
 * Both actions follow the codebase's `useActionState` shape so the
 * admin forms can render inline errors.
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export type PrerequisiteFormResult =
  | { kind: "success" }
  | { kind: "error"; error: string; message?: string };

const ERROR_MESSAGE: Record<string, string> = {
  invalid_course_id: "Pick a valid course.",
  invalid_requires_course_id: "Pick a valid required course.",
  self_prerequisite: "A course cannot require itself.",
  course_not_found: "That course no longer exists.",
  requires_course_not_found: "The required course no longer exists.",
  requires_lesson_not_found: "That lesson is not part of the required course.",
  prerequisite_cycle: "That rule would create a loop. Pick a different course.",
  prerequisite_not_found: "That rule is already gone.",
  db_error: "Database error. Please try again.",
  unknown: "Something went wrong. Please try again.",
};

function mapError(kind: string): string {
  return ERROR_MESSAGE[kind] ?? ERROR_MESSAGE.unknown ?? "Something went wrong.";
}

function lessonOrNull(formData: FormData): string | null {
  const raw = formData.get("requiresLessonId");
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Server action used by the admin prerequisites page to add a rule.
 * Reads `courseId`, `requiresCourseId`, and an optional
 * `requiresLessonId` from the FormData.
 */
export async function setPrerequisiteAction(
  _prevState: PrerequisiteFormResult | null,
  formData: FormData,
): Promise<PrerequisiteFormResult> {
  const admin = await requireAdmin();

  const courseId = String(formData.get("courseId") ?? "").trim();
  const requiresCourseId = String(formData.get("requiresCourseId") ?? "").trim();

  const container = buildContainer();
  const result = await container.setCoursePrerequisite.execute({
    actorId: admin.id,
    courseId,
    requiresCourseId,
    requiresLessonId: lessonOrNull(formData),
  });

  if (!result.ok) {
    return { kind: "error", error: result.error.kind, message: mapError(result.error.kind) };
  }

  redirect(`/admin/courses/${courseId}/prerequisites?saved=1`);
}

/**
 * Server action used by the admin prerequisites page to remove a rule.
 * Removal is a soft delete; the triple can be re-added later.
 */
export async function removePrerequisiteAction(
  _prevState: PrerequisiteFormResult | null,
  formData: FormData,
): Promise<PrerequisiteFormResult> {
  const admin = await requireAdmin();

  const courseId = String(formData.get("courseId") ?? "").trim();
  const requiresCourseId = String(formData.get("requiresCourseId") ?? "").trim();

  const container = buildContainer();
  const result = await container.removeCoursePrerequisite.execute({
    actorId: admin.id,
    courseId,
    requiresCourseId,
    requiresLessonId: lessonOrNull(formData),
  });

  if (!result.ok) {
    return { kind: "error", error: result.error.kind, message: mapError(result.error.kind) };
  }

  redirect(`/admin/courses/${courseId}/prerequisites?removed=1`);
}
