/**
 * AdminGetQuiz — fetch a single quiz (with course) for the admin
 * detail/edit page.
 *
 * STORY-091. Single-record version of the AdminListQuizzes
 * batch-hydration, mirroring AdminGetPayment.
 */

import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { Quiz } from "@/domain/entities/Quiz";
import type { IQuizRepository, QuizRepositoryError } from "@/ports/repositories/IQuizRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";

export interface AdminGetQuizInput {
  quizId: string;
}

export type AdminGetQuizError =
  | { kind: "quiz_not_found" }
  | { kind: "course_not_found" }
  | QuizRepositoryError
  | { kind: "course_error"; message: string };

export type AdminGetQuizResult = Result<{ quiz: Quiz; course: Course }, AdminGetQuizError>;

export interface AdminGetQuizDeps {
  quizRepo: IQuizRepository;
  courseRepo: CourseRepository;
}

export class AdminGetQuiz {
  constructor(private readonly deps: AdminGetQuizDeps) {}

  async execute(input: AdminGetQuizInput): Promise<AdminGetQuizResult> {
    const quizResult = await this.deps.quizRepo.findById(input.quizId);
    if (!quizResult.ok) {
      return Result.err(quizResult.error);
    }
    if (!quizResult.value) {
      return Result.err({ kind: "quiz_not_found" });
    }
    const quiz = quizResult.value;

    const courseResult = await this.deps.courseRepo.findById(quiz.courseId);
    if (!courseResult.ok) {
      if (courseResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      return Result.err({ kind: "course_error", message: String(courseResult.error.kind) });
    }

    return Result.ok({ quiz, course: courseResult.value });
  }
}
