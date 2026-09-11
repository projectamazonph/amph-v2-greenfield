/**
 * PrismaAssignmentRepository — production adapter for
 * IAssignmentRepository.
 *
 * P1-02 (PR-C slice 2). Soft-deleted rows (deletedAt set) are
 * invisible to every read, matching the InMemory fake. Update
 * persists the whole row so submit/grade transitions and the actor
 * stamp land together.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { isAssignmentStatus, type Assignment } from "@/domain/entities/Assignment";
import type { AssignmentStatus } from "@/domain/entities/Assignment";
import type {
  AssignmentFilter,
  AssignmentPage,
  AssignmentQueryError,
  IAssignmentRepository,
} from "@/ports/repositories/IAssignmentRepository";
import type { AssignmentRepoError } from "@/ports/repositories/IAssignmentRepository";

interface AssignmentRow {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  description: string;
  dueAt: Date;
  status: string;
  submittedAt: Date | null;
  gradedAt: Date | null;
  grade: number | null;
  graderId: string | null;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export class PrismaAssignmentRepository implements IAssignmentRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(assignment: Assignment): Promise<Result<Assignment, AssignmentQueryError>> {
    try {
      const row = await this.db.assignment.create({
        data: {
          id: assignment.id,
          courseId: assignment.courseId,
          userId: assignment.userId,
          title: assignment.title,
          description: assignment.description,
          dueAt: assignment.dueAt,
          status: assignment.status,
          submittedAt: assignment.submittedAt,
          gradedAt: assignment.gradedAt,
          grade: assignment.grade,
          graderId: assignment.graderId,
          feedback: assignment.feedback,
          createdById: assignment.createdById,
          updatedById: assignment.updatedById,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Assignment | null, AssignmentQueryError>> {
    try {
      const row = await this.db.assignment.findFirst({
        where: { id, deletedAt: null },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByUser(
    userId: string,
    filter?: Pick<AssignmentFilter, "courseId" | "status">,
  ): Promise<Result<readonly Assignment[], AssignmentQueryError>> {
    try {
      const rows = await this.db.assignment.findMany({
        where: {
          userId,
          deletedAt: null,
          ...(filter?.courseId !== undefined ? { courseId: filter.courseId } : {}),
          ...(filter?.status !== undefined ? { status: filter.status } : {}),
        },
        orderBy: { dueAt: "desc" },
      });
      return Result.ok(rows.map((row) => this.mapRow(row)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(filter?: AssignmentFilter): Promise<Result<AssignmentPage, AssignmentQueryError>> {
    const page = Math.max(1, filter?.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filter?.pageSize ?? DEFAULT_PAGE_SIZE));
    try {
      const where = {
        deletedAt: null,
        ...(filter?.courseId !== undefined ? { courseId: filter.courseId } : {}),
        ...(filter?.status !== undefined ? { status: filter.status } : {}),
        ...(filter?.search !== undefined && filter.search.trim() !== ""
          ? { title: { contains: filter.search.trim(), mode: "insensitive" as const } }
          : {}),
      };
      const [rows, totalCount] = await Promise.all([
        this.db.assignment.findMany({
          where,
          orderBy: { dueAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.db.assignment.count({ where }),
      ]);
      return Result.ok({
        rows: rows.map((row) => this.mapRow(row)),
        totalCount,
        page,
        pageSize,
      });
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(assignment: Assignment): Promise<Result<Assignment, AssignmentRepoError>> {
    try {
      const row = await this.db.assignment.update({
        where: { id: assignment.id },
        data: {
          courseId: assignment.courseId,
          userId: assignment.userId,
          title: assignment.title,
          description: assignment.description,
          dueAt: assignment.dueAt,
          status: assignment.status,
          submittedAt: assignment.submittedAt,
          gradedAt: assignment.gradedAt,
          grade: assignment.grade,
          graderId: assignment.graderId,
          feedback: assignment.feedback,
          deletedAt: assignment.deletedAt,
          updatedById: assignment.updatedById,
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

  private mapRow(row: AssignmentRow): Assignment {
    if (!isAssignmentStatus(row.status)) {
      throw new Error(`Assignment ${row.id} has an invalid persisted status: "${row.status}"`);
    }
    const status: AssignmentStatus = row.status;
    return {
      id: row.id,
      courseId: row.courseId,
      userId: row.userId,
      title: row.title,
      description: row.description,
      dueAt: row.dueAt,
      status,
      submittedAt: row.submittedAt,
      gradedAt: row.gradedAt,
      grade: row.grade,
      graderId: row.graderId,
      feedback: row.feedback,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      // Actor ids are bare nullable TEXT (W0-01 convention). A null
      // means the row predates actor stamping; surface it as an
      // empty stamp rather than failing hydration.
      createdById: row.createdById ?? "",
      updatedById: row.updatedById ?? "",
    };
  }
}
