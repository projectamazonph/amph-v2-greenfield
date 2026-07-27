/**
 * AdminListQuizzes — admin list view of all quizzes across courses.
 *
 * STORY-091. Returns every quiz joined with its parent course (for
 * the admin list page). Mirrors ListRefundRequests' batch-hydration
 * pattern: dedupe courseIds, look each up once, build a Map.
 *
 * Per-quiz attempt counts are NOT included here — the list page
 * doesn't need them. If/when it does, add `countByQuizId` to the
 * quiz attempt repo and hydrate here.
 */

import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { Quiz } from "@/domain/entities/Quiz";
import type { IQuizRepository, QuizRepositoryError } from "@/ports/repositories/IQuizRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";

export interface AdminListQuizzesInput {
  /** Optional courseId filter; when present, returns only that course's quizzes. */
  courseId?: string;
}

export type AdminListQuizzesError = QuizRepositoryError | { kind: "course_error"; message: string };

export type AdminListQuizzesResult = Result<
  {
    quizzes: readonly Quiz[];
    courses: ReadonlyMap<string, Course>;
  },
  AdminListQuizzesError
>;

export interface AdminListQuizzesDeps {
  quizRepo: IQuizRepository;
  courseRepo: CourseRepository;
}

export class AdminListQuizzes {
  constructor(private readonly deps: AdminListQuizzesDeps) {}

  async execute(input: AdminListQuizzesInput): Promise<AdminListQuizzesResult> {
    const listResult = input.courseId
      ? await this.deps.quizRepo.findByCourseId(input.courseId)
      : await this.deps.quizRepo.findAll();
    if (!listResult.ok) {
      return Result.err(listResult.error);
    }

    const quizzes = listResult.value;
    const courseIds = Array.from(new Set(quizzes.map((q) => q.courseId)));
    const courses = new Map<string, Course>();
    for (const courseId of courseIds) {
      const r = await this.deps.courseRepo.findById(courseId);
      if (!r.ok) {
        return Result.err({ kind: "course_error", message: String(r.error.kind) });
      }
      if (r.value) {
        courses.set(courseId, r.value);
      }
    }

    return Result.ok({ quizzes, courses });
  }
}
