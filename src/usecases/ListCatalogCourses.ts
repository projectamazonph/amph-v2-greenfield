/**
 * ListCatalogCourses — public catalog listing (STORY-014).
 *
 * Like ListCourses, but enriches each course with module metadata
 * from the Module table (module count, total lesson count, total
 * estimated video duration). This data comes from the Module+Lesson
 * tables populated by the STORY-013 import script, not from the
 * embedded Course.curriculum JSON.
 *
 * STORY-014.
 */

import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { Module } from "@/domain/entities/Module";
import type { Lesson } from "@/domain/entities/Lesson";

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

// ── Types ─────────────────────────────────────────────────────────────────────

/** Module summary attached to each catalog course. */
export interface CatalogModuleSummary {
  readonly id: string;
  readonly title: string;
  readonly displayOrder: number;
  readonly lessonCount: number;
  readonly estimatedMinutes: number;
}

/** A course as it appears in the public catalog, enriched with module data. */
export interface CatalogCourse {
  readonly course: Course;
  readonly moduleCount: number;
  readonly lessonCount: number;
  readonly estimatedMinutes: number;
  readonly modules: readonly CatalogModuleSummary[];
}

export type ListCatalogCoursesError = { kind: "db_error"; message: string } | { kind: "not_found" };

export interface ListCatalogCoursesResult {
  readonly courses: readonly CatalogCourse[];
}

// ── Use case ─────────────────────────────────────────────────────────────────

export class ListCatalogCourses {
  constructor(options: {
    courseRepo: CourseRepository;
    moduleRepo: IModuleRepository;
    lessonRepo: ILessonRepository;
  }) {
    this._courseRepo = options.courseRepo;
    this._moduleRepo = options.moduleRepo;
    this._lessonRepo = options.lessonRepo;
  }

  async execute(): Promise<Result<ListCatalogCoursesResult, ListCatalogCoursesError>> {
    const coursesResult = await this._courseRepo.listPublished();
    if (!coursesResult.ok) {
      return Result.err({
        kind: "db_error",
        message: courseErrorMsg(coursesResult.error as CourseError),
      });
    }

    const courses = coursesResult.value;
    if (courses.length === 0) {
      return Result.ok({ courses: [] });
    }

    // Fetch all modules in parallel for all courses
    const moduleResults = await Promise.all(
      courses.map((c: Course) => this._moduleRepo.findByCourseId(c.id)),
    );

    const catalogCourses: CatalogCourse[] = [];

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i]!;
      const moduleResult = moduleResults[i];

      if (!moduleResult) {
        // Should not happen — Promise.all returns one result per input
        return Result.err({ kind: "db_error", message: "Unexpected: missing module result" });
      }

      if (Result.isErr(moduleResult)) {
        return Result.err({
          kind: "db_error",
          message: moduleErrorMsg(moduleResult.error as ModuleError),
        });
      }

      const modules: Module[] = [...moduleResult.value];
      let totalLessons = 0;
      let totalMinutes = 0;

      const moduleSummaries: CatalogModuleSummary[] = [];

      // Fetch lessons for each module in parallel
      const lessonResults = await Promise.all(
        modules.map((m: Module) => this._lessonRepo.findByModuleId(m.id)),
      );

      for (let j = 0; j < modules.length; j++) {
        const mod = modules[j]!;
        const lessonResult = lessonResults[j];

        if (!lessonResult) {
          return Result.err({
            kind: "db_error",
            message: "Unexpected: missing lesson result",
          });
        }

        if (Result.isErr(lessonResult)) {
          return Result.err({
            kind: "db_error",
            message: lessonErrorMsg(lessonResult.error as LessonError),
          });
        }

        const lessons: Lesson[] = [...lessonResult.value];
        totalLessons += lessons.length;

        // Sum estimatedMinutes from video lessons
        let moduleMinutes = 0;
        for (const lesson of lessons) {
          if (
            lesson.type === "VIDEO" &&
            typeof lesson.content === "object" &&
            lesson.content !== null &&
            "durationMinutes" in lesson.content
          ) {
            const dm = (lesson.content as { durationMinutes: number }).durationMinutes;
            moduleMinutes += dm;
          }
        }
        totalMinutes += moduleMinutes;

        moduleSummaries.push({
          id: mod.id,
          title: mod.title,
          displayOrder: mod.displayOrder,
          lessonCount: lessons.length,
          estimatedMinutes: moduleMinutes,
        });
      }

      catalogCourses.push({
        course,
        moduleCount: modules.length,
        lessonCount: totalLessons,
        estimatedMinutes: totalMinutes,
        modules: moduleSummaries,
      });
    }

    return Result.ok({ courses: catalogCourses });
  }

  private readonly _courseRepo: CourseRepository;
  private readonly _moduleRepo: IModuleRepository;
  private readonly _lessonRepo: ILessonRepository;
}
