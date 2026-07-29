/**
 * ImportAmphContent — use case for seeding the AMPH curriculum from MDX files.
 *
 * Reads MDX files via IAmphContentReader, maps frontmatter to Module/Lesson
 * entities, and upserts them into the database via IModuleRepository and
 * ILessonRepository.
 *
 * Two courses are seeded:
 *   - "ppc-foundations"   ← modules 0–4
 *   - "accelerated-mastery" ← modules 5–8
 *
 * Module and Lesson IDs are deterministic (via ContentIdGenerator), so
 * re-running the import is idempotent: existing rows are updated, not
 * duplicated.
 *
 * STORY-013.
 */

import { Result } from "@/domain/shared/Result";
import type { IAmphContentReader } from "@/domain/ports/content/IAmphContentReader";
import type { ContentIdGenerator } from "@/ports/system/ContentIdGenerator";
import { createModule, updateModule } from "@/domain/entities/Module";
import type { Module } from "@/domain/entities/Module";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";
import type { LessonType } from "@/domain/entities/Lesson";
import type { Lesson } from "@/domain/entities/Lesson";
import { createLesson, updateLesson } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import { createCourse } from "@/domain/entities/Course";
import { RebuildCourseCurriculum } from "@/usecases/RebuildCourseCurriculum";

// ── Result types ───────────────────────────────────────────────────────────────

export interface ImportAmphContentResult {
  readonly coursesCreated: number;
  readonly modulesUpserted: number;
  readonly lessonsUpserted: number;
  /** Course slugs whose `Course.curriculum` was rebuilt from the imported rows. */
  readonly curriculaRebuilt: readonly string[];
}

export type ImportAmphContentError =
  | { kind: "course_creation_failed"; message: string }
  | { kind: "read_error"; message: string }
  | { kind: "db_error"; message: string };

// ── Course mapping ────────────────────────────────────────────────────────────

/** Maps a module number to the owning course slug. */
function courseSlugForModule(moduleNumber: number): string | null {
  if (moduleNumber >= 0 && moduleNumber <= 4) return "ppc-foundations";
  if (moduleNumber >= 5 && moduleNumber <= 8) return "accelerated-mastery";
  return null; // unknown module — skip
}

// ── Lesson type mapping ──────────────────────────────────────────────────────

/**
 * Maps the raw MDX `type` frontmatter field to a LessonType.
 * Unknown types default to TEXT.
 */
function mapLessonType(type: string): LessonType {
  switch (type) {
    case "reading":
    case "text":
      return "TEXT";
    case "video":
      return "VIDEO";
    case "quiz":
      return "QUIZ";
    default:
      return "TEXT";
  }
}

// ── ContentId helpers ────────────────────────────────────────────────────────

function moduleIdFor(idGen: ContentIdGenerator, courseSlug: string, moduleNumber: number): string {
  return idGen.generateId(`module:${courseSlug}:${moduleNumber}`);
}

function lessonIdFor(idGen: ContentIdGenerator, moduleId: string, lessonSlug: string): string {
  return idGen.generateId(`lesson:${moduleId}:${lessonSlug}`);
}

// ── Use case ─────────────────────────────────────────────────────────────────

export interface ImportAmphContentOptions {
  contentReader: IAmphContentReader;
  courseRepo: CourseRepository;
  moduleRepo: IModuleRepository;
  lessonRepo: ILessonRepository;
  idGen: ContentIdGenerator;
}

export class ImportAmphContent {
  constructor(private readonly options: ImportAmphContentOptions) {}

  /**
   * Built from the same three repos this use case already holds, in the
   * same style as `MarkLessonComplete` building its own `AwardXP`. The
   * import writes Module/Lesson rows, but every student-facing read of a
   * lesson (the lesson page, `AuthorizeLessonAccess`, `MarkLessonComplete`)
   * goes through the denormalized `Course.curriculum` JSON. Leaving that at
   * the stub written in step 2 makes every imported lesson 404.
   */
  private get rebuildCourseCurriculum(): RebuildCourseCurriculum {
    return new RebuildCourseCurriculum({
      courseRepo: this.options.courseRepo,
      moduleRepo: this.options.moduleRepo,
      lessonRepo: this.options.lessonRepo,
    });
  }

  async execute(): Promise<Result<ImportAmphContentResult, ImportAmphContentError>> {
    const { idGen } = this.options;

    // Step 1: read all MDX files
    const readResult = await this.options.contentReader.readAll();
    if (!readResult.ok) {
      return Result.err({ kind: "read_error", message: readResult.error.message });
    }

    const courseGroups = readResult.value;
    let coursesCreated = 0;
    let modulesUpserted = 0;
    let lessonsUpserted = 0;
    /** slug → id, for the curriculum rebuild in step 4. */
    const importedCourseIds = new Map<string, string>();

    // Step 2: ensure the two target courses exist
    for (const targetSlug of ["ppc-foundations", "accelerated-mastery"]) {
      const existing = await this.options.courseRepo.findBySlug(targetSlug);
      // `not_found` is a normal "doesn't exist yet" — anything else is a real error
      if (!existing.ok && existing.error.kind !== "not_found") {
        return Result.err({
          kind: "db_error",
          message: courseErrorMessage(existing.error),
        });
      }
      if (!existing.ok || !existing.value) {
        // Create minimal course with a stub section + lesson.
        // The real curriculum is populated by the MDX import (modules
        // + lessons are imported below, separate from Course.curriculum).
        // The stub satisfies the Course entity's non-empty curriculum
        // validation and is replaced when the admin updates the course.
        const createResult = createCourse({
          id: idGen.generateId(`course:${targetSlug}`),
          slug: targetSlug,
          title: targetSlug === "ppc-foundations" ? "PPC Foundations" : "Accelerated Mastery",
          tagline: "Curriculum imported via MDX.",
          description: "Imported from MDX content. See modules for lesson content.",
          priceMinor: 0,
          curriculum: {
            sections: [
              {
                id: "stub-section",
                title: "Curriculum (see modules)",
                lessons: [
                  {
                    id: "stub-lesson",
                    title: "Placeholder",
                    type: "TEXT",
                    content: { body: "Curriculum will be imported via the import script." },
                  },
                ],
              },
            ],
          },
          status: "DRAFT",
        });
        if (!createResult.ok) {
          return Result.err({
            kind: "course_creation_failed",
            message: `Failed to create course ${targetSlug}: ${createResult.error.kind}`,
          });
        }
        const saved = await this.options.courseRepo.create(createResult.value);
        if (!saved.ok) {
          return Result.err({
            kind: "db_error",
            message: courseErrorMessage(saved.error),
          });
        }
        coursesCreated++;
      }
    }

    // Step 3: process each course group
    for (const group of courseGroups) {
      const courseResult = await this.options.courseRepo.findBySlug(group.courseSlug);
      if (!courseResult.ok && courseResult.error.kind !== "not_found") {
        return Result.err({
          kind: "db_error",
          message: courseErrorMessage(courseResult.error),
        });
      }
      if (!courseResult.ok || !courseResult.value) continue; // should not happen
      const course = courseResult.value;

      // Group files by module number
      const byModule = new Map<number, (typeof group.files)[number][]>();
      for (const file of group.files) {
        const num = file.frontmatter.moduleNumber;
        if (!byModule.has(num)) byModule.set(num, []);
        byModule.get(num)!.push(file);
      }

      // Sort modules by number
      const sortedModules = [...byModule.entries()].sort(([a], [b]) => a - b);

      for (const [moduleNumber, files] of sortedModules) {
        const moduleSlug = files[0]!.dirSlug;
        const moduleId = moduleIdFor(idGen, group.courseSlug, moduleNumber);
        const moduleTitle = deriveTitle(moduleSlug);

        const moduleResult = await this.upsertModule({
          moduleId,
          courseId: course.id,
          title: moduleTitle,
          displayOrder: moduleNumber + 1,
        });
        if (!moduleResult.ok) {
          return Result.err({
            kind: "db_error",
            message: moduleErrorMessage(moduleResult.error),
          });
        }
        modulesUpserted++;

        const sortedLessons = [...files].sort(
          (a, b) => a.frontmatter.lessonNumber - b.frontmatter.lessonNumber,
        );

        for (const file of sortedLessons) {
          const lessonType = mapLessonType(file.frontmatter.type);
          const lessonId = lessonIdFor(idGen, moduleId, file.frontmatter.slug);

          const lessonResult = await this.upsertLesson({
            lessonId,
            moduleId,
            title: file.frontmatter.title,
            lessonType,
            body: file.body,
            estimatedMinutes: file.frontmatter.estimatedMinutes,
            displayOrder: file.frontmatter.lessonNumber,
          });
          if (!lessonResult.ok) {
            return Result.err({
              kind: "db_error",
              message: lessonErrorMessage(lessonResult.error),
            });
          }
          lessonsUpserted++;
        }
      }

      importedCourseIds.set(group.courseSlug, course.id);
    }

    // Step 4: rebuild `Course.curriculum` from the rows just written.
    // Without this the course keeps the stub curriculum from step 2 and
    // every lesson link off the catalog page resolves to a 404.
    const curriculaRebuilt: string[] = [];
    const curriculaFailed: string[] = [];
    for (const [slug, courseId] of importedCourseIds) {
      const { rebuilt } = await this.rebuildCourseCurriculum.execute(courseId);
      if (rebuilt) {
        curriculaRebuilt.push(slug);
      } else {
        curriculaFailed.push(slug);
      }
    }

    // RebuildCourseCurriculum never returns an error, by design: an admin
    // editing one lesson must not have that edit rolled back because the
    // read model could not be refreshed. For the importer the rebuild IS
    // the deliverable, so a silent `{ rebuilt: false }` here would exit 0
    // while leaving that course's lessons 404ing off the catalog, which is
    // the exact failure this use case exists to prevent. Fail loud instead.
    if (curriculaFailed.length > 0) {
      return Result.err({
        kind: "db_error",
        message:
          `Modules and lessons were written, but Course.curriculum could not be rebuilt for: ` +
          `${curriculaFailed.join(", ")}. Those courses will 404 on their lesson pages until ` +
          `the import is re-run successfully.`,
      });
    }

    return Result.ok({ coursesCreated, modulesUpserted, lessonsUpserted, curriculaRebuilt });
  }

  private async upsertModule(params: {
    moduleId: string;
    courseId: string;
    title: string;
    displayOrder: number;
  }): Promise<Result<Module, ModuleError>> {
    const existing = await this.options.moduleRepo.findById(params.moduleId);
    if (existing.ok && existing.value) {
      if (
        existing.value.title !== params.title ||
        existing.value.displayOrder !== params.displayOrder
      ) {
        const patch = { title: params.title, displayOrder: params.displayOrder };
        const updated = updateModule(existing.value, patch);
        if (updated.ok) {
          return this.options.moduleRepo.update(updated.value);
        }
      }
      return Result.ok(existing.value);
    }
    const created = createModule({
      id: params.moduleId,
      courseId: params.courseId,
      title: params.title,
      displayOrder: params.displayOrder,
    });
    if (!created.ok) {
      return Result.err({ kind: "db_error", message: created.error.message });
    }
    return this.options.moduleRepo.create(created.value);
  }

  private async upsertLesson(params: {
    lessonId: string;
    moduleId: string;
    title: string;
    lessonType: LessonType;
    body: string;
    estimatedMinutes: number;
    displayOrder: number;
  }): Promise<Result<Lesson, LessonError>> {
    const existing = await this.options.lessonRepo.findById(params.lessonId);
    if (existing.ok && existing.value) {
      if (
        existing.value.title !== params.title ||
        existing.value.displayOrder !== params.displayOrder
      ) {
        const patch = { title: params.title };
        const updated = updateLesson(existing.value, patch);
        if (updated.ok) {
          return this.options.lessonRepo.update(updated.value);
        }
      }
      return Result.ok(existing.value);
    }
    const content = buildLessonContent(params);
    const created = createLesson({
      id: params.lessonId,
      moduleId: params.moduleId,
      title: params.title,
      type: params.lessonType,
      content,
      displayOrder: params.displayOrder,
    });
    if (!created.ok) {
      return Result.err({ kind: "db_error", message: created.error.message });
    }
    return this.options.lessonRepo.create(created.value);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Derive a human-readable module title from a directory slug. */
function deriveTitle(dirSlug: string): string {
  // Strip leading module number: "1-foundations" → "foundations"
  const withoutNumber = dirSlug.replace(/^\d+-/, "");
  // Convert kebab-case → Title Case
  return withoutNumber
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Convert a CourseError to a human-readable message (handles the
 *  `not_found` and `slug_taken` kinds which don't have a `message`). */
function courseErrorMessage(e: CourseError): string {
  if ("message" in e && e.message) return e.message;
  return e.kind;
}

/** Convert a ModuleError to a human-readable message. */
function moduleErrorMessage(e: ModuleError): string {
  if ("message" in e && e.message) return e.message;
  return e.kind;
}

/** Convert a LessonError to a human-readable message. */
function lessonErrorMessage(e: LessonError): string {
  if ("message" in e && e.message) return e.message;
  return e.kind;
}

/** Build the Lesson.content JSON value from the parsed MDX data.
 *
 * The Lesson entity's validation (`validateTextContent` etc.) only
 * inspects the type-specific fields, so we only set those here.
 * `estimatedMinutes` and `xpReward` from frontmatter are NOT stored
 * in the content JSON — they live in the frontmatter only and are
 * intended to be re-applied at the lesson page render (STORY-026)
 * via the MDX component frontmatter, or via a follow-up metadata
 * column. This is documented in the STORY-013 follow-ups.
 */
function buildLessonContent(params: {
  lessonType: LessonType;
  body: string;
  estimatedMinutes: number;
}): unknown {
  if (params.lessonType === "TEXT") {
    return { body: params.body };
  }
  if (params.lessonType === "VIDEO") {
    return { durationMinutes: params.estimatedMinutes };
  }
  // QUIZ or unknown — fall through; content shape is per-type.
  return { body: params.body };
}
