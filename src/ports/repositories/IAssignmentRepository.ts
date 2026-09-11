/**
 * IAssignmentRepository — port for persisting student assignments.
 *
 * P1-02 (PR-C slice 2). Entities in, entities out: the use cases
 * build and transition the Assignment entity (create, submit, grade)
 * before persisting.
 *
 * Implementations: PrismaAssignmentRepository (prod),
 * InMemoryAssignmentRepository (tests).
 *
 * ADR-014: every port method returns Result<T, E>. No exceptions
 * across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { Assignment, AssignmentStatus } from "@/domain/entities/Assignment";

export type AssignmentRepoError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

/**
 * Queries and creates never report `not_found`: a missing row is a
 * null. Only `update` can hit a missing id.
 */
export type AssignmentQueryError = { kind: "db_error"; message: string };

export interface AssignmentFilter {
  courseId?: string;
  status?: AssignmentStatus;
  /** Case-insensitive title substring. */
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AssignmentPage {
  rows: readonly Assignment[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface IAssignmentRepository {
  /**
   * Persist a new assignment.
   *
   * Errors: `db_error` — database failure, including a duplicate id.
   * Postconditions: the row is retrievable via findById with
   * identical fields.
   */
  create(assignment: Assignment): Promise<Result<Assignment, AssignmentQueryError>>;

  /** Single assignment by id, or null when it does not exist. */
  findById(id: string): Promise<Result<Assignment | null, AssignmentQueryError>>;

  /**
   * One student's assignments, newest due first. Soft-deleted rows
   * are excluded.
   */
  listByUser(
    userId: string,
    filter?: Pick<AssignmentFilter, "courseId" | "status">,
  ): Promise<Result<readonly Assignment[], AssignmentQueryError>>;

  /**
   * Admin view across students, newest due first, paginated.
   * Page is 1-based; pageSize is capped at 50 by the caller.
   * Soft-deleted rows are excluded.
   */
  listAll(filter?: AssignmentFilter): Promise<Result<AssignmentPage, AssignmentQueryError>>;

  /**
   * Persist transitions on an existing assignment (submit, grade,
   * soft delete).
   * Errors: `not_found` — no assignment with this id exists.
   */
  update(assignment: Assignment): Promise<Result<Assignment, AssignmentRepoError>>;
}
