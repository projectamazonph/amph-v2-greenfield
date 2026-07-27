/**
 * InMemoryQuizRepository — fast, synchronous test adapter for IQuizRepository.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 */

import type { IQuizRepository, QuizRepositoryError } from "@/ports/repositories/IQuizRepository";
import type { Quiz } from "@/domain/entities/Quiz";
import { Result } from "@/domain/shared/Result";

export class InMemoryQuizRepository implements IQuizRepository {
  private quizzes: Quiz[] = [];

  async create(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>> {
    this.quizzes.push(Object.freeze({ ...quiz }));
    return Result.ok(quiz);
  }

  async findById(id: string): Promise<Result<Quiz | null, QuizRepositoryError>> {
    const found = this.quizzes.find((q) => q.id === id) ?? null;
    return Result.ok(found);
  }

  async findByCourseId(courseId: string): Promise<Result<readonly Quiz[], QuizRepositoryError>> {
    const filtered = this.quizzes
      .filter((q) => q.courseId === courseId)
      .sort((a, b) => a.id.localeCompare(b.id));
    return Result.ok(filtered);
  }

  async findAll(): Promise<Result<readonly Quiz[], QuizRepositoryError>> {
    return Result.ok([...this.quizzes].sort((a, b) => a.id.localeCompare(b.id)));
  }

  async update(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>> {
    const idx = this.quizzes.findIndex((q) => q.id === quiz.id);
    if (idx === -1) {
      return Result.err({ kind: "not_found" });
    }
    this.quizzes[idx] = Object.freeze({ ...quiz });
    return Result.ok(quiz);
  }

  async delete(id: string): Promise<Result<void, QuizRepositoryError>> {
    const idx = this.quizzes.findIndex((q) => q.id === id);
    if (idx === -1) {
      return Result.err({ kind: "not_found" });
    }
    this.quizzes.splice(idx, 1);
    return Result.ok(undefined);
  }

  clear(): void {
    this.quizzes = [];
  }

  seed(quiz: Quiz): void {
    this.quizzes.push(Object.freeze({ ...quiz }));
  }
}
