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
    // P0-6: conform to the port contract. `create` is NOT an upsert.
    if (this.attempts.some((a) => a.id === attempt.id)) {
      return Result.err({ kind: "already_exists" });
    }
    this.attempts.push(Object.freeze({ ...attempt }));
    return Result.ok(attempt);
  }

  async update(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>> {
    // P0-6: conform to the port contract. `update` requires the row
    // to exist; it is NOT an upsert. Use case code that wants to
    // create-or-update should call findById first.
    const idx = this.attempts.findIndex((a) => a.id === attempt.id);
    if (idx === -1) {
      return Result.err({ kind: "not_found" });
    }
    this.attempts[idx] = Object.freeze({ ...attempt });
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
