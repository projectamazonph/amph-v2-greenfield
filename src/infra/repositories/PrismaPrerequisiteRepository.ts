/**
 * PrismaPrerequisiteRepository — production adapter for
 * IPrerequisiteRepository.
 *
 * P1-01 (PR-C slice 1). Soft-deleted rows (deletedAt set) are
 * invisible to findRule and listByCourseId, matching the InMemory
 * fake. Update persists the whole row so the soft-delete flag and
 * the actor stamp land together.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { Prerequisite } from "@/domain/entities/Prerequisite";
import type {
  IPrerequisiteRepository,
  PrerequisiteQueryError,
  PrerequisiteRepoError,
} from "@/ports/repositories/IPrerequisiteRepository";

interface PrerequisiteRow {
  id: string;
  courseId: string;
  requiresCourseId: string;
  requiresLessonId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

export class PrismaPrerequisiteRepository implements IPrerequisiteRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(prereq: Prerequisite): Promise<Result<Prerequisite, PrerequisiteQueryError>> {
    try {
      const row = await this.db.prerequisite.create({
        data: {
          id: prereq.id,
          courseId: prereq.courseId,
          requiresCourseId: prereq.requiresCourseId,
          requiresLessonId: prereq.requiresLessonId,
          createdAt: prereq.createdAt,
          deletedAt: prereq.deletedAt,
          createdById: prereq.createdById,
          updatedById: prereq.updatedById,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findRule(
    courseId: string,
    requiresCourseId: string,
    requiresLessonId: string | null,
  ): Promise<Result<Prerequisite | null, PrerequisiteQueryError>> {
    try {
      const row = await this.db.prerequisite.findFirst({
        where: { courseId, requiresCourseId, requiresLessonId, deletedAt: null },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByCourseId(
    courseId: string,
  ): Promise<Result<readonly Prerequisite[], PrerequisiteQueryError>> {
    try {
      const rows = await this.db.prerequisite.findMany({
        where: { courseId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      return Result.ok(rows.map((row) => this.mapRow(row)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(prereq: Prerequisite): Promise<Result<Prerequisite, PrerequisiteRepoError>> {
    try {
      const row = await this.db.prerequisite.update({
        where: { id: prereq.id },
        data: {
          courseId: prereq.courseId,
          requiresCourseId: prereq.requiresCourseId,
          requiresLessonId: prereq.requiresLessonId,
          deletedAt: prereq.deletedAt,
          updatedById: prereq.updatedById,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2025") {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: PrerequisiteRow): Prerequisite {
    return {
      id: row.id,
      courseId: row.courseId,
      requiresCourseId: row.requiresCourseId,
      requiresLessonId: row.requiresLessonId,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
      // Actor ids are bare nullable TEXT (W0-01 convention). A null
      // here means the row predates actor stamping; surface it as an
      // empty stamp rather than failing hydration.
      createdById: row.createdById ?? "",
      updatedById: row.updatedById ?? "",
    };
  }
}
