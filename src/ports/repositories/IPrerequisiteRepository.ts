/**
 * IPrerequisiteRepository — port for persisting course-gating rules.
 *
 * P1-01 (PR-C slice 1). Entities in, entities out: the
 * SetCoursePrerequisite use case builds and validates the Prerequisite
 * entity (blank ids, self-require, cycles) before persisting.
 *
 * Implementations: PrismaPrerequisiteRepository (prod),
 * InMemoryPrerequisiteRepository (tests).
 *
 * ADR-014: every port method returns Result<T, E>. No exceptions
 * across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { Prerequisite } from "@/domain/entities/Prerequisite";

export type PrerequisiteRepoError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

/**
 * Queries and creates never report `not_found`: a missing rule is a
 * null, and a duplicate triple is a `db_error`. Only `update` can hit
 * a missing id.
 */
export type PrerequisiteQueryError = { kind: "db_error"; message: string };

export interface IPrerequisiteRepository {
  /**
   * Persist a new rule.
   *
   * Errors: `db_error` — database failure, including a duplicate
   * (courseId, requiresCourseId, requiresLessonId) triple.
   * Postconditions: the rule is retrievable via findRule with the
   * same triple.
   */
  create(prereq: Prerequisite): Promise<Result<Prerequisite, PrerequisiteQueryError>>;

  /**
   * The rule for an exact triple, or null when none exists.
   * Soft-deleted rows are invisible to this query.
   */
  findRule(
    courseId: string,
    requiresCourseId: string,
    requiresLessonId: string | null,
  ): Promise<Result<Prerequisite | null, PrerequisiteQueryError>>;

  /**
   * All live rules gating a course, in creation order.
   * Soft-deleted rows are excluded.
   */
  listByCourseId(courseId: string): Promise<Result<readonly Prerequisite[], PrerequisiteQueryError>>;

  /**
   * Persist changes on an existing rule (soft-delete flag, actor stamp).
   * Errors: `not_found` — no rule with this id exists.
   */
  update(prereq: Prerequisite): Promise<Result<Prerequisite, PrerequisiteRepoError>>;
}
