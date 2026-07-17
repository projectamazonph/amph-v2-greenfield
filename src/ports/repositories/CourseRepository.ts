/**
 * CourseRepository port — Story 016.
 *
 * ADR-014: Every port method returns Result. Never throw across layer boundaries.
 */

import type { Course } from "@/domain/entities/Course";
import { Result } from "@/lib/Result";

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
}
