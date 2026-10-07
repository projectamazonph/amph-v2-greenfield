/**
 * ICapstoneRepository — port for capstone submissions (LEARN-043).
 *
 * One row per learner is the norm (latest wins); the port supports
 * history via listByUser. Implementations:
 * PrismaCapstoneRepository (prod), InMemoryCapstoneRepository (tests).
 */

import type { Result } from "@/domain/shared/Result";
import type { CapstoneStatus, CapstoneSubmission } from "@/domain/entities/CapstoneSubmission";

export type CapstoneRepoError = { kind: "not_found" } | { kind: "db_error"; message: string };

export type CapstoneQueryError = { kind: "db_error"; message: string };

export interface ICapstoneRepository {
  /** Persist a new submission row. */
  create(submission: CapstoneSubmission): Promise<Result<CapstoneSubmission, CapstoneQueryError>>;

  /** Single row by id, or null. Soft-deleted rows excluded. */
  findById(id: string): Promise<Result<CapstoneSubmission | null, CapstoneQueryError>>;

  /**
   * The learner's latest submission, or null when they never
   * started one. Latest = greatest createdAt.
   */
  findLatestByUser(userId: string): Promise<Result<CapstoneSubmission | null, CapstoneQueryError>>;

  /** All of one learner's rows, newest first. */
  listByUser(userId: string): Promise<Result<readonly CapstoneSubmission[], CapstoneQueryError>>;

  /**
   * Reviewer queue: every row in the given status across learners,
   * oldest first (fair review order). Soft-deleted rows excluded.
   * Route-gated by requireAdmin; the port takes no actor.
   */
  listByStatus(
    status: CapstoneStatus,
  ): Promise<Result<readonly CapstoneSubmission[], CapstoneQueryError>>;

  /**
   * Persist a transition (submit, return, pass). Errors: `not_found`.
   */
  update(submission: CapstoneSubmission): Promise<Result<CapstoneSubmission, CapstoneRepoError>>;
}
