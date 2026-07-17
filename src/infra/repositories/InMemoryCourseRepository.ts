/**
 * InMemoryCourseRepository — fast test adapter for CourseRepository port.
 */

import type { Course } from "@/domain/entities/Course";
import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import { Result } from "@/domain/shared/Result";

export class InMemoryCourseRepository implements CourseRepository {
  private courses = new Map<string, Course>();

  async listPublished(): Promise<Result<readonly Course[], CourseError>> {
    const all = Array.from(this.courses.values())
      .filter((c) => c.status === "PUBLISHED")
      .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.getTime() - b.createdAt.getTime());
    return Result.ok(all);
  }

  async listAll(): Promise<Result<readonly Course[], CourseError>> {
    return Result.ok(Array.from(this.courses.values()));
  }

  async findById(id: string): Promise<Result<Course, CourseError>> {
    const c = this.courses.get(id);
    if (!c) return Result.err({ kind: "not_found" });
    return Result.ok(c);
  }

  async findBySlug(slug: string): Promise<Result<Course, CourseError>> {
    for (const c of this.courses.values()) {
      if (c.slug === slug) return Result.ok(c);
    }
    return Result.err({ kind: "not_found" });
  }

  seed(courses: Course[]): void {
    courses.forEach((c) => this.courses.set(c.id, c));
  }

  /**
   * Seed a course with sensible defaults for story-022 access-policy tests.
   * Requires all Course fields including courseTier and previewLessonCount.
   */
  seedWithAccess(course: Omit<Course, "courseTier" | "previewLessonCount"> & {
    courseTier: Course["courseTier"];
    previewLessonCount: Course["previewLessonCount"];
  }): void {
    this.courses.set(course.id, course as Course);
  }

  clear(): void {
    this.courses.clear();
  }
}
