/**
 * adminAssignment.action.ts — P1-02 (PR-C slice 2).
 *
 * Server action wrappers around `CreateAssignment` and
 * `GradeAssignment`. Resolve the calling admin via `requireAdmin`
 * and forward the input. Both follow the codebase's `useActionState`
 * shape so the admin forms can render inline errors.
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export type AdminAssignmentFormResult =
  | { kind: "success" }
  | { kind: "error"; error: string; message?: string };

const ERROR_MESSAGE: Record<string, string> = {
  invalid_title: "Give the assignment a title.",
  invalid_description: "Describe the work the student must do.",
  invalid_due_at: "Pick a valid due date.",
  user_not_found: "No student uses that email.",
  course_not_found: "That course no longer exists.",
  assignment_not_found: "That assignment is gone.",
  invalid_status: "That assignment cannot move right now.",
  invalid_grade: "Grade must be a whole number from 0 to 100.",
  db_error: "Database error. Please try again.",
  unknown: "Something went wrong. Please try again.",
};

function mapError(kind: string): string {
  return ERROR_MESSAGE[kind] ?? ERROR_MESSAGE.unknown ?? "Something went wrong.";
}

/**
 * Server action used by the admin new-assignment form. Reads
 * `courseId`, `userEmail`, `title`, `description`, and `dueAt`
 * (datetime-local) from the FormData.
 */
export async function createAssignmentAction(
  _prevState: AdminAssignmentFormResult | null,
  formData: FormData,
): Promise<AdminAssignmentFormResult> {
  const admin = await requireAdmin();

  const container = buildContainer();
  const result = await container.createAssignment.execute({
    actorId: admin.id,
    courseId: String(formData.get("courseId") ?? "").trim(),
    userEmail: String(formData.get("userEmail") ?? "").trim(),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    dueAt: new Date(String(formData.get("dueAt") ?? "")),
  });

  if (!result.ok) {
    return { kind: "error", error: result.error.kind, message: mapError(result.error.kind) };
  }

  redirect("/admin/assignments?saved=1");
}

/**
 * Server action used by the admin grade form. Reads `assignmentId`,
 * `grade` (integer string), and optional `feedback` from the FormData.
 */
export async function gradeAssignmentAction(
  _prevState: AdminAssignmentFormResult | null,
  formData: FormData,
): Promise<AdminAssignmentFormResult> {
  const admin = await requireAdmin();

  const container = buildContainer();
  const result = await container.gradeAssignment.execute({
    actorId: admin.id,
    assignmentId: String(formData.get("assignmentId") ?? "").trim(),
    grade: Number.parseInt(String(formData.get("grade") ?? ""), 10),
    feedback: String(formData.get("feedback") ?? "").trim() || null,
  });

  if (!result.ok) {
    return { kind: "error", error: result.error.kind, message: mapError(result.error.kind) };
  }

  redirect("/admin/assignments?graded=1");
}
