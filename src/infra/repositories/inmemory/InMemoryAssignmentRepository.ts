/**
 * InMemoryAssignmentRepository — test fake for IAssignmentRepository.
 *
 * P1-02 (PR-C slice 2). Stores Assignment entities in a Map, keyed
 * by id. Mirrors the Prisma adapter's contracts: id uniqueness on
 * create, soft-deleted rows invisible to reads, newest-due-first
 * ordering, 1-based pagination, and not_found on updating a
 * missing id.
 */

import { Result } from "@/domain/shared/Result";
import type { Assignment } from "@/domain/entities/Assignment";
import type {
  AssignmentFilter,
  AssignmentPage,
  AssignmentQueryError,
  IAssignmentRepository,
} from "@/ports/repositories/IAssignmentRepository";
import type { AssignmentRepoError } from "@/ports/repositories/IAssignmentRepository";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export class InMemoryAssignmentRepository implements IAssignmentRepository {
  private readonly rows = new Map<string, Assignment>();

  async create(assignment: Assignment): Promise<Result<Assignment, AssignmentQueryError>> {
    if (this.rows.has(assignment.id)) {
      return Result.err({
        kind: "db_error",
        message: `Unique constraint failed on id: ${assignment.id}`,
      });
    }
    this.rows.set(assignment.id, assignment);
    return Result.ok(assignment);
  }

  async findById(id: string): Promise<Result<Assignment | null, AssignmentQueryError>> {
    const row = this.rows.get(id);
    if (!row || row.deletedAt !== null) return Result.ok(null);
    return Result.ok(row);
  }

  async listByUser(
    userId: string,
    filter?: Pick<AssignmentFilter, "courseId" | "status">,
  ): Promise<Result<readonly Assignment[], AssignmentQueryError>> {
    const rows = Array.from(this.rows.values())
      .filter((row) => row.deletedAt === null && row.userId === userId)
      .filter((row) => filter?.courseId === undefined || row.courseId === filter.courseId)
      .filter((row) => filter?.status === undefined || row.status === filter.status)
      .sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime());
    return Result.ok(rows);
  }

  async listAll(filter?: AssignmentFilter): Promise<Result<AssignmentPage, AssignmentQueryError>> {
    const page = Math.max(1, filter?.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filter?.pageSize ?? DEFAULT_PAGE_SIZE));
    const needle = filter?.search?.trim().toLowerCase();
    const rows = Array.from(this.rows.values())
      .filter((row) => row.deletedAt === null)
      .filter((row) => filter?.courseId === undefined || row.courseId === filter.courseId)
      .filter((row) => filter?.status === undefined || row.status === filter.status)
      .filter((row) => needle === undefined || needle === "" || row.title.toLowerCase().includes(needle))
      .sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime());
    return Result.ok({
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      totalCount: rows.length,
      page,
      pageSize,
    });
  }

  async update(assignment: Assignment): Promise<Result<Assignment, AssignmentRepoError>> {
    if (!this.rows.has(assignment.id)) return Result.err({ kind: "not_found" });
    this.rows.set(assignment.id, assignment);
    return Result.ok(assignment);
  }

  /** Test helper: seed a row directly, bypassing the port. */
  seed(assignment: Assignment): void {
    this.rows.set(assignment.id, assignment);
  }

  /** Test helper: clear all rows. */
  clear(): void {
    this.rows.clear();
  }
}
