/**
 * InMemoryRetrievalCheckRepository — test fake (LEARN-040).
 */

import type {
  IRetrievalCheckRepository,
  RetrievalCheckQueryError,
} from "@/ports/repositories/IRetrievalCheckRepository";
import type { RetrievalCheckAttempt } from "@/domain/entities/RetrievalCheckAttempt";
import { Result } from "@/domain/shared/Result";

export class InMemoryRetrievalCheckRepository implements IRetrievalCheckRepository {
  private attempts: RetrievalCheckAttempt[] = [];

  async record(
    attempt: RetrievalCheckAttempt,
  ): Promise<Result<RetrievalCheckAttempt, RetrievalCheckQueryError>> {
    this.attempts.push(Object.freeze({ ...attempt }));
    return Result.ok(attempt);
  }

  async listByUserAndLesson(
    userId: string,
    lessonSlug: string,
  ): Promise<Result<readonly RetrievalCheckAttempt[], RetrievalCheckQueryError>> {
    const filtered = this.attempts
      .filter((a) => a.userId === userId && a.lessonSlug === lessonSlug && a.deletedAt === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return Result.ok(filtered);
  }

  async listByUser(
    userId: string,
  ): Promise<Result<readonly RetrievalCheckAttempt[], RetrievalCheckQueryError>> {
    const filtered = this.attempts
      .filter((a) => a.userId === userId && a.deletedAt === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Result.ok(filtered);
  }

  clear(): void {
    this.attempts = [];
  }
}
