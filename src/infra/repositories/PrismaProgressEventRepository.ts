/**
 * PrismaProgressEventRepository — production adapter for IProgressEventRepository.
 *
 * STORY-027: MarkLessonComplete use case + ProgressService + ProgressEvent log.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IProgressEventRepository,
  ProgressEventError,
} from "@/ports/repositories/IProgressEventRepository";
import type { ProgressEvent } from "@/domain/entities/ProgressEvent";

export class PrismaProgressEventRepository implements IProgressEventRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(event: ProgressEvent): Promise<Result<ProgressEvent, ProgressEventError>> {
    try {
      const row = await this.db.progressEvent.create({
        data: {
          id: event.id,
          userId: event.userId,
          courseId: event.courseId,
          lessonId: event.lessonId,
          type: event.type,
          metadata: event.metadata as unknown as Prisma.InputJsonValue,
          createdAt: event.createdAt,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserId(
    userId: string,
  ): Promise<Result<readonly ProgressEvent[], ProgressEventError>> {
    try {
      const rows = await this.db.progressEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map(this.mapRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByCourseId(
    courseId: string,
  ): Promise<Result<readonly ProgressEvent[], ProgressEventError>> {
    try {
      const rows = await this.db.progressEvent.findMany({
        where: { courseId },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map(this.mapRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: {
    id: string;
    userId: string;
    courseId: string;
    lessonId: string | null;
    type: string;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }): ProgressEvent {
    return {
      id: row.id,
      userId: row.userId,
      courseId: row.courseId,
      lessonId: row.lessonId,
      type: row.type as ProgressEvent["type"],
      metadata: Object.freeze(row.metadata as Record<string, unknown>),
      createdAt: row.createdAt,
    };
  }
}
