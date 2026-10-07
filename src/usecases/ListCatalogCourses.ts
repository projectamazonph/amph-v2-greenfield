/**
 * ListCatalogCourses — public catalog listing (STORY-014).
 *
 * Like ListCourses, but enriches each course with module metadata
 * from the Module table (module count, total lesson count, total
 * estimated learner time). This data comes from the Module+Lesson
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
  /** Slugs of published courses dropped because their rows could not be read. */
  readonly skipped?: readonly string[];
}

/**
 * Per-course enrichment outcome. The slug rides along on the failure so a
 * dropped course can be named instead of only its error text.
 */
type EnrichmentOutcome =
  | { readonly slug: string; readonly ok: true; readonly course: CatalogCourse }
  | { readonly slug: string; readonly ok: false; readonly message: string };

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

    const outcomes = await Promise.all(courses.map((course) => this.enrich(course)));

    const catalogCourses: CatalogCourse[] = [];
    const skipped: string[] = [];
    const failures: string[] = [];
    for (const outcome of outcomes) {
      if (outcome.ok) {
        catalogCourses.push(outcome.course);
      } else {
        skipped.push(outcome.slug);
        failures.push(outcome.message);
      }
    }

    // One unreadable course must not blank the whole catalog: a single
    // corrupt Module row used to take /courses down. Degrade per course, and
    // only report db_error when nothing loaded at all so the page still
    // surfaces the real cause instead of the "no courses yet" empty state.
    if (catalogCourses.length === 0) {
      return Result.err({ kind: "db_error", message: failures[0]! });
    }

    return skipped.length > 0
      ? Result.ok({ courses: catalogCourses, skipped })
      : Result.ok({ courses: catalogCourses });
  }

  private async enrich(course: Course): Promise<EnrichmentOutcome> {
    const slug = course.slug;
    const modulesResult = await this._moduleRepo.findByCourseId(course.id);
    if (Result.isErr(modulesResult)) {
      return { slug, ok: false, message: moduleErrorMsg(modulesResult.error as ModuleError) };
    }

    const modules: Module[] = [...modulesResult.value];

    // Fetch lessons for each module in parallel
    const lessonResults = await Promise.all(
      modules.map((m: Module) => this._lessonRepo.findByModuleId(m.id)),
    );

    const moduleSummaries: CatalogModuleSummary[] = [];
    let totalLessons = 0;
    let totalMinutes = 0;

    for (let j = 0; j < modules.length; j++) {
      const mod = modules[j]!;
      const lessonResult = lessonResults[j];

      if (!lessonResult) {
        return { slug, ok: false, message: "Unexpected: missing lesson result" };
      }

      if (Result.isErr(lessonResult)) {
        return { slug, ok: false, message: lessonErrorMsg(lessonResult.error as LessonError) };
      }

      const lessons: Lesson[] = [...lessonResult.value];
      totalLessons += lessons.length;

      // Sum planned learner time across every lesson type.
      let moduleMinutes = 0;
      for (const lesson of lessons) {
        moduleMinutes += lesson.plannedMinutes;
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

    return {
      slug,
      ok: true,
      course: {
        course,
        moduleCount: modules.length,
        lessonCount: totalLessons,
        estimatedMinutes: totalMinutes,
        modules: moduleSummaries,
      },
    };
  }

  private readonly _courseRepo: CourseRepository;
  private readonly _moduleRepo: IModuleRepository;
  private readonly _lessonRepo: ILessonRepository;
}
