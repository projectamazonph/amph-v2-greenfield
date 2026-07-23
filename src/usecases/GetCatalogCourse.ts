/**
 * GetCatalogCourse — public course detail (STORY-014).
 *
 * Fetches a single course by slug and enriches it with full module
 * + lesson data from the Module+Lesson tables (STORY-013 import).
 * Only PUBLISHED courses are shown.
 *
 * The response is shaped as a flat list of modules, each with their
 * lessons, matching the structure the `/courses/[slug]` page needs
 * for the curriculum accordion.
 *
 * STORY-014.
 */

import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";
import type { Module } from "@/domain/entities/Module";

// ── Error helpers ─────────────────────────────────────────────────────────────

function courseErrorMsg(e: CourseError): string {
  if ("message" in e && typeof e.message === "string") return e.message;
  return e.kind;
}

function moduleErrorMsg(e: ModuleError): string {
  if ("message" in e && typeof e.message === "string") return e.message;
  return e.kind;
}

function lessonErrorMsg(e: LessonError): string {
  if ("message" in e && typeof e.message === "string") return e.message;
  return e.kind;
}

/** A lesson as shown in the public catalog. */
export interface CatalogLesson {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  /** Duration in minutes for VIDEO lessons, 0 otherwise. */
  readonly estimatedMinutes: number;
  readonly displayOrder: number;
}

/** A module as shown in the public catalog. */
export interface CatalogModule {
  readonly id: string;
  readonly title: string;
  readonly displayOrder: number;
  readonly lessons: readonly CatalogLesson[];
}

/** A course as shown on the public detail page. */
export interface CatalogCourseDetail {
  readonly courseId: string;
  readonly slug: string;
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  readonly priceMinor: number;
  readonly currency: string;
  readonly coverImage: string | null;
  readonly status: string;
  readonly totalLessonCount: number;
  readonly totalEstimatedMinutes: number;
  readonly modules: readonly CatalogModule[];
}

export type GetCatalogCourseError = { kind: "not_found" } | { kind: "db_error"; message: string };

export class GetCatalogCourse {
  constructor(options: {
    courseRepo: CourseRepository;
    moduleRepo: IModuleRepository;
    lessonRepo: ILessonRepository;
  }) {
    this._courseRepo = options.courseRepo;
    this._moduleRepo = options.moduleRepo;
    this._lessonRepo = options.lessonRepo;
  }

  async execute(slug: string): Promise<Result<CatalogCourseDetail, GetCatalogCourseError>> {
    if (!slug) return Result.err({ kind: "not_found" });

    const courseResult = await this._courseRepo.findBySlug(slug);
    if (!courseResult.ok) {
      if (courseResult.error.kind === "not_found") {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({
        kind: "db_error",
        message: courseErrorMsg(courseResult.error as CourseError),
      });
    }
    if (!courseResult.value) return Result.err({ kind: "not_found" });

    const course = courseResult.value;
    if (course.status !== "PUBLISHED") return Result.err({ kind: "not_found" });

    // Fetch modules for this course
    const modulesResult = await this._moduleRepo.findByCourseId(course.id);
    if (Result.isErr(modulesResult)) {
      return Result.err({
        kind: "db_error",
        message: moduleErrorMsg(modulesResult.error as ModuleError),
      });
    }

    const modules: Module[] = [...modulesResult.value];
    const catalogModules: CatalogModule[] = [];
    let totalLessonCount = 0;
    let totalEstimatedMinutes = 0;

    // Fetch lessons for each module in parallel
    const lessonResults = await Promise.all(
      modules.map((m) => this._lessonRepo.findByModuleId(m.id)),
    );

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i]!;
      const lessonResult = lessonResults[i];

      if (!lessonResult) {
        return Result.err({ kind: "db_error", message: "Unexpected: missing lesson result" });
      }

      if (Result.isErr(lessonResult)) {
        return Result.err({
          kind: "db_error",
          message: lessonErrorMsg(lessonResult.error as LessonError),
        });
      }

      const lessons: Lesson[] = [...lessonResult.value];
      totalLessonCount += lessons.length;

      const catalogLessons: CatalogLesson[] = lessons.map((l) => {
        let estimatedMinutes = 0;
        if (
          l.type === "VIDEO" &&
          typeof l.content === "object" &&
          l.content !== null &&
          "durationMinutes" in l.content
        ) {
          estimatedMinutes = (l.content as { durationMinutes: number }).durationMinutes;
          totalEstimatedMinutes += estimatedMinutes;
        }
        return {
          id: l.id,
          title: l.title,
          type: l.type,
          estimatedMinutes,
          displayOrder: l.displayOrder,
        };
      });

      catalogModules.push({
        id: mod.id,
        title: mod.title,
        displayOrder: mod.displayOrder,
        lessons: catalogLessons,
      });
    }

    return Result.ok({
      courseId: course.id,
      slug: course.slug,
      title: course.title,
      tagline: course.tagline,
      description: course.description,
      priceMinor: course.price.minor,
      currency: course.price.currency,
      coverImage: course.coverImage,
      status: course.status,
      totalLessonCount,
      totalEstimatedMinutes,
      modules: catalogModules,
    });
  }

  private readonly _courseRepo: CourseRepository;
  private readonly _moduleRepo: IModuleRepository;
  private readonly _lessonRepo: ILessonRepository;
}
