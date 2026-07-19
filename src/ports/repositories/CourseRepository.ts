/**
 * CourseRepository port — Story 016.
 *
 * ADR-014: Every port method returns Result. Never throw across layer boundaries.
 */

import type { Course } from "@/domain/entities/Course";
import { Result } from "@/domain/shared/Result";

export type CourseError =
  | { kind: "not_found" }
  | { kind: "slug_taken" }
  | { kind: "db_error"; message: string };

export interface CourseRepository {
  /** All published courses, ordered by displayOrder then createdAt. */
  listPublished(): Promise<Result<readonly Course[], CourseError>>;

  /** All courses regardless of status (admin only — STORY-036). */
  listAll(): Promise<Result<readonly Course[], CourseError>>;

  findById(id: string): Promise<Result<Course, CourseError>>;
  findBySlug(slug: string): Promise<Result<Course, CourseError>>;

  // ── STORY-048a: Admin courses CRUD ──────────────────────

  /**
   * Persist a new course. Enforces slug uniqueness across the table
   * (including ARCHIVED courses). Returns `slug_taken` if a course
   * with this slug already exists.
   */
  create(course: Course): Promise<Result<Course, CourseError>>;

  /**
   * Update an existing course. Enforces slug uniqueness (excluding
   * the current course). Returns `not_found` if the id doesn't exist,
   * `slug_taken` if the new slug collides with another course.
   */
  update(course: Course): Promise<Result<Course, CourseError>>;

  /**
   * Soft-delete: set status=ARCHIVED. Idempotent (archiving an
   * already-ARCHIVED course returns the existing course).
   * Returns `not_found` if the id doesn't exist.
   */
  archive(id: string): Promise<Result<Course, CourseError>>;
}
