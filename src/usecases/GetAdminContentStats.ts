import { Result } from "@/domain/shared/Result";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IModuleRepository } from "@/ports/repositories/IModuleRepository";
import type { ILessonRepository } from "@/ports/repositories/ILessonRepository";

export interface AdminContentStats {
  courseCount: number;
  moduleCount: number;
  lessonCount: number;
}

export class GetAdminContentStats {
  constructor(
    private readonly deps: {
      courseRepo: CourseRepository;
      moduleRepo: IModuleRepository;
      lessonRepo: ILessonRepository;
    },
  ) {}

  async execute(): Promise<Result<AdminContentStats, { kind: "db_error"; message: string }>> {
    const coursesResult = await this.deps.courseRepo.listAll();
    if (!coursesResult.ok) {
      return Result.err({
        kind: "db_error",
        message:
          coursesResult.error.kind === "db_error"
            ? coursesResult.error.message
            : coursesResult.error.kind,
      });
    }

    const moduleResults = await Promise.all(
      coursesResult.value.map((course) => this.deps.moduleRepo.findByCourseId(course.id)),
    );
    const modules = [];
    for (const result of moduleResults) {
      if (!result.ok) {
        return Result.err({
          kind: "db_error",
          message: result.error.kind === "db_error" ? result.error.message : result.error.kind,
        });
      }
      modules.push(...result.value);
    }

    const lessonResults = await Promise.all(
      modules.map((module) => this.deps.lessonRepo.findByModuleId(module.id)),
    );
    let lessonCount = 0;
    for (const result of lessonResults) {
      if (!result.ok) {
        return Result.err({
          kind: "db_error",
          message: result.error.kind === "db_error" ? result.error.message : result.error.kind,
        });
      }
      lessonCount += result.value.length;
    }

    return Result.ok({
      courseCount: coursesResult.value.length,
      moduleCount: modules.length,
      lessonCount,
    });
  }
}
