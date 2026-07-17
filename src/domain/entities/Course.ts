/**
 * Course entity — Story 008.
 *
 * The core product domain object. Represents an AMPH course that students can enroll in.
 *
 * KISS: Only knows its own invariants.
 * YAGNI: No discount, no subscription-tier gating here — those belong in use cases.
 * SRP: One reason to change — the course model itself.
 * Fail Fast: Invalid states are rejected at construction.
 */

import { Result } from "@/domain/shared/Result";
import { Money } from "@/domain/values/Money";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type LessonType = "VIDEO" | "TEXT" | "QUIZ";

export interface Lesson {
  readonly id: string;
  readonly title: string;
  readonly type: LessonType;
  /** JSON content — shape depends on type (VIDEO has `durationMinutes`, TEXT has `body`, QUIZ has `questions`). */
  readonly content: unknown;
}

export interface Section {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly Lesson[];
}

export interface Curriculum {
  readonly sections: readonly Section[];
}

export interface Course {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly price: Money;
  readonly curriculum: Curriculum;
  readonly coverImage: string | null;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly status: CourseStatus;
  /** Access tier required for full access (enrollment or matching subscription). */
  readonly courseTier: CourseAccessTier;
  /** How many lessons are visible in preview mode (courseTier = PREVIEW). */
  readonly previewLessonCount: number;
  readonly createdAt: Date;
}

export type CreateCourseError =
  | { kind: "invalid_slug" }
  | { kind: "invalid_price" }
  | { kind: "invalid_curriculum" };

/**
 * Create a Course domain object.
 *
 * Slug rules ( kebab-case ):
 * - Lowercase letters, numbers, and single hyphens only
 * - Must start with an alphanumeric character
 * - Cannot end with a hyphen
 * - No consecutive hyphens
 */
export function createCourse(params: {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  priceMinor: number;
  currency?: string;
  curriculum: Curriculum;
  coverImage?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  status?: CourseStatus;
  courseTier?: CourseAccessTier;
  previewLessonCount?: number;
  createdAt?: Date;
}): Result<Course, CreateCourseError> {
  // Fail Fast: slug validation
  if (!isValidSlug(params.slug)) {
    return Result.err({ kind: "invalid_slug" });
  }

  // Fail Fast: price must be non-negative
  if (params.priceMinor < 0) {
    return Result.err({ kind: "invalid_price" });
  }

  // Fail Fast: curriculum must have at least one section, each with at least one lesson
  if (!isValidCurriculum(params.curriculum)) {
    return Result.err({ kind: "invalid_curriculum" });
  }

  return Result.ok({
    id: params.id,
    slug: params.slug,
    title: params.title.trim(),
    tagline: params.tagline.trim(),
    description: params.description.trim(),
    price: Money.of(params.priceMinor, (params.currency as "PHP") ?? "PHP"),
    curriculum: params.curriculum,
    coverImage: params.coverImage ?? null,
    isFeatured: params.isFeatured ?? false,
    displayOrder: params.displayOrder ?? 0,
    status: params.status ?? "DRAFT",
    courseTier: params.courseTier ?? "STARTER",
    previewLessonCount: params.previewLessonCount ?? 1,
    createdAt: params.createdAt ?? new Date(),
  });
}

// ── Private helpers ─────────────────────────────────────────

const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidSlug(slug: string): boolean {
  return Boolean(slug) && VALID_SLUG.test(slug);
}

function isValidCurriculum(c: Curriculum): boolean {
  return c.sections.length > 0 && c.sections.every((s) => s.lessons.length > 0);
}

// ── Query helpers ───────────────────────────────────────────

/** Total number of lessons across all sections. */
export function courseLessonCount(course: Course): number {
  return course.curriculum.sections.reduce(
    (total, section) => total + section.lessons.length,
    0,
  );
}

/** Sum of video lesson durations in minutes. Ignores TEXT and QUIZ lessons. */
export function courseTotalDurationMinutes(course: Course): number {
  return course.curriculum.sections.reduce((total, section) => {
    return (
      total +
      section.lessons.reduce((sectionTotal, lesson) => {
        if (
          lesson.type === "VIDEO" &&
          typeof lesson.content === "object" &&
          lesson.content !== null &&
          "durationMinutes" in lesson.content
        ) {
          return sectionTotal + ((lesson.content as { durationMinutes: number }).durationMinutes);
        }
        return sectionTotal;
      }, 0)
    );
  }, 0);
}

/** Is this course available for purchase? */
export function courseIsAvailable(course: Course): boolean {
  return course.status === "PUBLISHED";
}
