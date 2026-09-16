/**
 * PrismaRetrievalCheckRepository — production adapter (LEARN-040).
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { RetrievalCheckAttempt } from "@/domain/entities/RetrievalCheckAttempt";
import type {
  IRetrievalCheckRepository,
  RetrievalCheckQueryError,
} from "@/ports/repositories/IRetrievalCheckRepository";

interface RetrievalCheckRow {
  id: string;
  userId: string;
  lessonSlug: string;
  checkId: string;
  correct: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

function mapRow(row: RetrievalCheckRow): RetrievalCheckAttempt {
  return {
    id: row.id,
    userId: row.userId,
    lessonSlug: row.lessonSlug,
    checkId: row.checkId,
    correct: row.correct,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    createdById: row.createdById ?? "",
    updatedById: row.updatedById ?? "",
  };
}

export class PrismaRetrievalCheckRepository implements IRetrievalCheckRepository {
  constructor(private readonly db: PrismaClient) {}

  async record(
    attempt: RetrievalCheckAttempt,
  ): Promise<Result<RetrievalCheckAttempt, RetrievalCheckQueryError>> {
    try {
      const row = await this.db.retrievalCheckAttempt.create({
        data: {
          id: attempt.id,
          userId: attempt.userId,
          lessonSlug: attempt.lessonSlug,
          checkId: attempt.checkId,
          correct: attempt.correct,
          createdById: attempt.createdById,
          updatedById: attempt.updatedById,
        },
      });
      return Result.ok(mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByUserAndLesson(
    userId: string,
    lessonSlug: string,
  ): Promise<Result<readonly RetrievalCheckAttempt[], RetrievalCheckQueryError>> {
    try {
      const rows = await this.db.retrievalCheckAttempt.findMany({
        where: { userId, lessonSlug, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      return Result.ok(rows.map(mapRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByUser(
    userId: string,
  ): Promise<Result<readonly RetrievalCheckAttempt[], RetrievalCheckQueryError>> {
    try {
      const rows = await this.db.retrievalCheckAttempt.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map(mapRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}
