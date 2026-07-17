/**
 * InMemoryQuizAttemptRepository — fast, synchronous test adapter for IQuizAttemptRepository.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 */

import type { IQuizAttemptRepository, QuizAttemptRepositoryError } from "@/ports/repositories/IQuizAttemptRepository";
import type { QuizAttempt } from "@/domain/entities/QuizAttempt";
import { Result } from "@/domain/shared/Result";

export class InMemoryQuizAttemptRepository implements IQuizAttemptRepository {
  private attempts: QuizAttempt[] = [];

  async create(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>> {
    this.attempts.push(Object.freeze({ ...attempt }));
    return Result.ok(attempt);
  }

  async update(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>> {
    const idx = this.attempts.findIndex((a) => a.id === attempt.id);
    if (idx === -1) {
      this.attempts.push(Object.freeze({ ...attempt }));
    } else {
      this.attempts[idx] = Object.freeze({ ...attempt });
    }
    return Result.ok(attempt);
  }

  async findById(id: string): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>> {
    const found = this.attempts.find((a) => a.id === id) ?? null;
    return Result.ok(found);
  }

  async findByUserAndQuiz(
    userId: string,
    quizId: string,
  ): Promise<Result<readonly QuizAttempt[], QuizAttemptRepositoryError>> {
    const filtered = this.attempts
      .filter((a) => a.userId === userId && a.quizId === quizId)
      .sort((a, b) => {
        const byTime = b.startedAt.getTime() - a.startedAt.getTime();
        if (byTime !== 0) return byTime;
        return b.id.localeCompare(a.id); // newest id first when timestamps equal
      });
    return Result.ok(filtered);
  }

  async findLatestByUserAndQuiz(
    userId: string,
    quizId: string,
  ): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>> {
    const results = await this.findByUserAndQuiz(userId, quizId);
    if (!results.ok) return results;
    return Result.ok(results.value?.[0] ?? null);
  }

  clear(): void {
    this.attempts = [];
  }

  seed(attempt: QuizAttempt): void {
    this.attempts.push(Object.freeze({ ...attempt }));
  }
}
