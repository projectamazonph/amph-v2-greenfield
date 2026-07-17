/**
 * PrismaQuizAttemptRepository — production adapter for IQuizAttemptRepository.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IQuizAttemptRepository,
  QuizAttemptRepositoryError,
} from "@/ports/repositories/IQuizAttemptRepository";
import type { QuizAttempt, QuizAttemptAnswer } from "@/domain/entities/QuizAttempt";

export class PrismaQuizAttemptRepository implements IQuizAttemptRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>> {
    try {
      await this.db.quizAttempt.create({
        data: {
          id: attempt.id,
          userId: attempt.userId,
          quizId: attempt.quizId,
          status: attempt.status,
          score: attempt.score,
          passed: attempt.passed,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
        },
      });

      for (const answer of attempt.answers) {
        await this.db.quizAttemptAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
          },
        });
      }

      return Result.ok(attempt);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>> {
    try {
      await this.db.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: attempt.status,
          score: attempt.score,
          passed: attempt.passed,
          completedAt: attempt.completedAt,
        },
      });

      await this.db.quizAttemptAnswer.deleteMany({ where: { attemptId: attempt.id } });
      for (const answer of attempt.answers) {
        await this.db.quizAttemptAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
          },
        });
      }

      return Result.ok(attempt);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>> {
    try {
      const row = await this.db.quizAttempt.findUnique({ where: { id } });
      if (!row) return Result.ok(null);
      const answers = await this.loadAnswers(id);
      return Result.ok(this.mapRow(row, answers));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserAndQuiz(
    userId: string,
    quizId: string,
  ): Promise<Result<readonly QuizAttempt[], QuizAttemptRepositoryError>> {
    try {
      const rows = await this.db.quizAttempt.findMany({
        where: { userId, quizId },
        orderBy: { startedAt: "desc" },
      });

      const attempts = await Promise.all(
        rows.map(async (row: {
          id: string;
          userId: string;
          quizId: string;
          status: string;
          score: number | null;
          passed: boolean | null;
          startedAt: Date;
          completedAt: Date | null;
        }) => {
          const answers = await this.loadAnswers(row.id);
          return this.mapRow(row, answers);
        }),
      );

      return Result.ok(attempts);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findLatestByUserAndQuiz(
    userId: string,
    quizId: string,
  ): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>> {
    try {
      const row = await this.db.quizAttempt.findFirst({
        where: { userId, quizId },
        orderBy: { startedAt: "desc" },
      });
      if (!row) return Result.ok(null);
      const answers = await this.loadAnswers(row.id);
      return Result.ok(this.mapRow(row, answers));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private async loadAnswers(attemptId: string): Promise<QuizAttemptAnswer[]> {
    const rows = await this.db.quizAttemptAnswer.findMany({ where: { attemptId } });
    return rows.map((r: { questionId: string; selectedOptionId: string }) => ({
      questionId: r.questionId,
      selectedOptionId: r.selectedOptionId,
    }));
  }

  private mapRow(
    row: {
      id: string;
      userId: string;
      quizId: string;
      status: string;
      score: number | null;
      passed: boolean | null;
      startedAt: Date;
      completedAt: Date | null;
    },
    answers: QuizAttemptAnswer[],
  ): QuizAttempt {
    return {
      id: row.id,
      userId: row.userId,
      quizId: row.quizId,
      status: row.status as QuizAttempt["status"],
      score: row.score,
      passed: row.passed,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      answers: Object.freeze(answers),
    };
  }
}
