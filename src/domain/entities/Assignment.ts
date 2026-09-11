/**
 * Assignment — instructor-assigned student work (P1-02).
 *
 * Lifecycle: PENDING → SUBMITTED → GRADED. Only the assignee can
 * submit; only a grader (admin path) can grade with an integer
 * 0–100 plus feedback. Overdue is derived, never persisted: a
 * PENDING row past its dueAt reads as overdue.
 *
 * The schema has no submission-body column, so submit is a status
 * flip with a timestamp. The student proves the work wherever the
 * assignment text points (lesson, simulator, live class).
 */

import { Result } from "@/domain/shared/Result";

export type AssignmentStatus = "PENDING" | "SUBMITTED" | "GRADED" | "OVERDUE";

const ALL_STATUSES: readonly AssignmentStatus[] = ["PENDING", "SUBMITTED", "GRADED", "OVERDUE"];

export function isAssignmentStatus(value: string): value is AssignmentStatus {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

export interface Assignment {
  readonly id: string;
  readonly courseId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string;
  readonly dueAt: Date;
  readonly status: AssignmentStatus;
  readonly submittedAt: Date | null;
  readonly gradedAt: Date | null;
  readonly grade: number | null;
  readonly graderId: string | null;
  readonly feedback: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly createdById: string;
  readonly updatedById: string;
}

export type CreateAssignmentError =
  | { kind: "invalid_course_id" }
  | { kind: "invalid_user_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_description" }
  | { kind: "invalid_due_at" };

export function createAssignment(params: {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  description: string;
  dueAt: Date;
  createdById: string;
  createdAt?: Date;
}): Result<Assignment, CreateAssignmentError> {
  if (!params.courseId.trim()) {
    return Result.err({ kind: "invalid_course_id" });
  }
  if (!params.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }
  if (!params.title.trim()) {
    return Result.err({ kind: "invalid_title" });
  }
  if (!params.description.trim()) {
    return Result.err({ kind: "invalid_description" });
  }
  if (Number.isNaN(params.dueAt.getTime())) {
    return Result.err({ kind: "invalid_due_at" });
  }
  const now = params.createdAt ?? new Date();
  return Result.ok({
    id: params.id,
    courseId: params.courseId,
    userId: params.userId,
    title: params.title,
    description: params.description,
    dueAt: params.dueAt,
    status: "PENDING",
    submittedAt: null,
    gradedAt: null,
    grade: null,
    graderId: null,
    feedback: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: params.createdById,
    updatedById: params.createdById,
  });
}

export type SubmitAssignmentError =
  | { kind: "not_assignee" }
  | { kind: "invalid_status" };

/**
 * The assignee flips PENDING (or a forward-compatible OVERDUE row)
 * to SUBMITTED. Anything else — graded, already submitted — is
 * rejected so a submission is always a forward move.
 */
export function submitAssignment(
  assignment: Assignment,
  params: { submittedById: string; submittedAt: Date },
): Result<Assignment, SubmitAssignmentError> {
  if (params.submittedById !== assignment.userId) {
    return Result.err({ kind: "not_assignee" });
  }
  if (assignment.status !== "PENDING" && assignment.status !== "OVERDUE") {
    return Result.err({ kind: "invalid_status" });
  }
  return Result.ok({
    ...assignment,
    status: "SUBMITTED",
    submittedAt: params.submittedAt,
    updatedAt: params.submittedAt,
  });
}

export type GradeAssignmentError =
  | { kind: "invalid_status" }
  | { kind: "invalid_grade" }
  | { kind: "invalid_grader_id" };

export const MIN_GRADE = 0;
export const MAX_GRADE = 100;

/**
 * A grader closes a SUBMITTED assignment with an integer 0–100 and
 * feedback. Grading anything else is rejected; re-grading goes
 * through a future returned-to-submitted transition, not this one.
 */
export function gradeAssignment(
  assignment: Assignment,
  params: { graderId: string; grade: number; feedback: string | null; gradedAt: Date },
): Result<Assignment, GradeAssignmentError> {
  if (!params.graderId.trim()) {
    return Result.err({ kind: "invalid_grader_id" });
  }
  if (assignment.status !== "SUBMITTED") {
    return Result.err({ kind: "invalid_status" });
  }
  if (!Number.isInteger(params.grade) || params.grade < MIN_GRADE || params.grade > MAX_GRADE) {
    return Result.err({ kind: "invalid_grade" });
  }
  return Result.ok({
    ...assignment,
    status: "GRADED",
    grade: params.grade,
    graderId: params.graderId,
    feedback: params.feedback,
    gradedAt: params.gradedAt,
    updatedAt: params.gradedAt,
  });
}

/**
 * Derived overdue: an unsubmitted row past its due date. Covers both
 * PENDING and a persisted OVERDUE row so a future sweep that writes
 * OVERDUE cannot silently flip the display back.
 */
export function isOverdue(assignment: Assignment, now: Date): boolean {
  if (assignment.status !== "PENDING" && assignment.status !== "OVERDUE") {
    return false;
  }
  return now.getTime() > assignment.dueAt.getTime();
}
