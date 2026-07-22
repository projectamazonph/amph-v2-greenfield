/**
 * PrismaLiveClassRepository, production adapter for ILiveClassRepository.
 *
 * STORY-050c / P0-2 follow-up: no Prisma model existed for LiveClass, so
 * buildProductionContainer() fell back to InMemoryLiveClassRepository:
 * every admin-scheduled live class vanished on cold start / redeploy.
 * That silently broke the SendLiveClassReminders cron pipeline too,
 * since it reads its class list from this same repo. Migration
 * 20260722020000_live_class adds the table.
 *
 * "Deleting" a live class is a soft status transition to "cancelled",
 * matching InMemoryLiveClassRepository's existing contract; there is no
 * hard delete.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  ILiveClassRepository,
  LiveClassRepositoryError,
} from "@/ports/repositories/ILiveClassRepository";
import type { LiveClass, LiveClassStatus } from "@/domain/entities/LiveClass";

interface LiveClassRow {
  id: string;
  courseId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  instructorId: string;
  meetingUrl: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaLiveClassRepository implements ILiveClassRepository {
  constructor(private readonly db: PrismaClient) {}

  async listAll(opts?: {
    courseId?: string;
  }): Promise<Result<LiveClass[], LiveClassRepositoryError>> {
    try {
      const rows = await this.db.liveClass.findMany({
        where: {
          status: { not: "cancelled" },
          ...(opts?.courseId ? { courseId: opts.courseId } : {}),
        },
        orderBy: { scheduledAt: "asc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<LiveClass | null, LiveClassRepositoryError>> {
    try {
      const row = await this.db.liveClass.findUnique({ where: { id } });
      return Result.ok(row ? this.mapRow(row) : null);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(liveClass: LiveClass): Promise<Result<void, LiveClassRepositoryError>> {
    try {
      await this.db.liveClass.create({
        data: {
          id: liveClass.id,
          courseId: liveClass.courseId,
          title: liveClass.title,
          scheduledAt: liveClass.scheduledAt,
          durationMinutes: liveClass.durationMinutes,
          instructorId: liveClass.instructorId,
          meetingUrl: liveClass.meetingUrl,
          status: liveClass.status,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(liveClass: LiveClass): Promise<Result<void, LiveClassRepositoryError>> {
    try {
      await this.db.liveClass.update({
        where: { id: liveClass.id },
        data: {
          title: liveClass.title,
          scheduledAt: liveClass.scheduledAt,
          durationMinutes: liveClass.durationMinutes,
          meetingUrl: liveClass.meetingUrl,
          status: liveClass.status,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async delete(id: string): Promise<Result<void, LiveClassRepositoryError>> {
    try {
      await this.db.liveClass.update({
        where: { id },
        data: { status: "cancelled" },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: LiveClassRow): LiveClass {
    return {
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      scheduledAt: row.scheduledAt,
      durationMinutes: row.durationMinutes,
      instructorId: row.instructorId,
      meetingUrl: row.meetingUrl,
      status: row.status as LiveClassStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
