/**
 * ArchiveCourse — soft-delete a course by setting status=ARCHIVED.
 *
 * STORY-048a: Admin courses CRUD.
 *
 * Flow:
 *  1. Find the course (to detect "already archived" idempotency)
 *  2. If already ARCHIVED → return wasAlreadyArchived=true (no DB write)
 *  3. Otherwise call courseRepo.archive(id) → return the archived course
 *
 * Idempotent: archiving an already-ARCHIVED course is a no-op that
 * returns wasAlreadyArchived=true. The repo's archive() is also
 * idempotent, but doing the find-first here lets us report the
 * "already archived" state cleanly to the caller.
 *
 * Note: ARCHIVED is currently terminal (no un-archive). STORY-048b may
 * add un-archive if needed.
 */

import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

// ── Input / Output types ───────────────────────────────────────────────────

export interface ArchiveCourseInput {
  courseId: string;
  actorId: string;
}

export type ArchiveCourseError =
  | { kind: "course_not_found" }
  | { kind: "db_error"; message: string };

export type ArchiveCourseResult = Result<
  { course: Course; wasAlreadyArchived: boolean },
  ArchiveCourseError
>;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface ArchiveCourseDeps {
  courseRepo: CourseRepository;
  recordAuditLog: RecordAuditLog;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class ArchiveCourse {
  constructor(private readonly deps: ArchiveCourseDeps) {}

  async execute(input: ArchiveCourseInput): Promise<ArchiveCourseResult> {
    // ── 1. Find ────────────────────────────────────────────
    const findResult = await this.deps.courseRepo.findById(input.courseId);
    if (!findResult.ok) {
      if (findResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      if (findResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: findResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch course" });
    }
    const existing = findResult.value;

    // ── 2. Idempotent: already archived ──────────────────
    if (existing.status === "ARCHIVED") {
      // Still log the attempt even if it was a no-op.
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "course.archived",
        targetType: "course",
        targetId: existing.id,
        metadata: { wasAlreadyArchived: true },
      });
      return Result.ok({ course: existing, wasAlreadyArchived: true });
    }

    // ── 3. Archive ────────────────────────────────────────
    const archiveResult = await this.deps.courseRepo.archive(input.courseId);
    if (!archiveResult.ok) {
      if (archiveResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      if (archiveResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: archiveResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to archive course" });
    }
    // Audit log — best-effort. RecordAuditLog swallows errors.
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "course.archived",
      targetType: "course",
      targetId: archiveResult.value.id,
      metadata: { wasAlreadyArchived: false },
    });

    return Result.ok({ course: archiveResult.value, wasAlreadyArchived: false });
  }
}
