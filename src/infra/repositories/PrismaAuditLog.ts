/**
 * PrismaAuditLog, production Prisma adapter for IAuditLog.
 *
 * STORY-050a (record) + STORY-061 (list). Every admin write calls
 * `RecordAuditLog`, which persists to this adapter.
 *
 * The domain `AuditLogEntry` doesn't carry `actorType` or `ipAddress`.
 * Those columns exist on the Prisma model for future use but have no
 * source in the current domain model, so they're left at the schema
 * default / null here, same limitation pattern as `PrismaCourseRepository`
 * documents for `curriculum`/`status`.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type { AuditAction } from "@/domain/values/AuditAction";
import { isAuditAction } from "@/domain/values/AuditAction";
import type {
  IAuditLog,
  AuditLogError,
  AuditLogFilters,
  AuditLogPage,
} from "@/ports/repositories/IAuditLog";

export class PrismaAuditLog implements IAuditLog {
  constructor(private readonly db: PrismaClient) {}

  async record(entry: AuditLogEntry): Promise<Result<void, AuditLogError>> {
    try {
      await this.db.auditLog.create({
        data: {
          id: entry.id,
          userId: entry.actorId,
          action: entry.action,
          resource: entry.targetType,
          resourceId: entry.targetId,
          payload: entry.metadata as object,
          createdAt: entry.occurredAt,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async list(filters: AuditLogFilters): Promise<Result<AuditLogPage, AuditLogError>> {
    const limit = Math.min(filters.limit ?? 50, 100);

    // Build Prisma where clause
    const where: Record<string, unknown> = {};

    if (filters.actorId) where.userId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.targetType) where.resource = filters.targetType;
    if (filters.targetId) where.resourceId = filters.targetId;

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Record<string, Date>).gte = filters.from;
      if (filters.to) (where.createdAt as Record<string, Date>).lte = filters.to;
    }

    // Decode cursor: "{occurredAt.toISOString()}::{id}"
    // (double-colon separator avoids collision with ISO timestamp colons)
    let cursorId: string | undefined;
    let cursorCreatedAt: Date | undefined;
    if (filters.cursor) {
      const separatorIdx = filters.cursor.indexOf("::");
      if (separatorIdx > 0) {
        const ts = filters.cursor.slice(0, separatorIdx);
        cursorId = filters.cursor.slice(separatorIdx + 2);
        cursorCreatedAt = new Date(ts);
      }
    }

    const cursor =
      cursorId && cursorCreatedAt
        ? { id_createdAt: { id: cursorId, createdAt: cursorCreatedAt } }
        : undefined;
    const skip = cursor ? 1 : undefined;

    try {
      // Run findMany + count in parallel
      const [rows, total] = await Promise.all([
        this.db.auditLog.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit,
          skip,
          cursor,
        }),
        this.db.auditLog.count({ where }),
      ]);

      const entries: AuditLogEntry[] = rows
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .map((row) => ({
          id: row.id,
          actorId: row.userId ?? "",
          // STORY-061: validate persisted action; corrupt/legacy action maps to "unknown"
          action: isAuditAction(row.action) ? row.action : ("unknown" as AuditAction),
          targetType: row.resource ?? "",
          targetId: row.resourceId ?? "",
          metadata: (row.payload ?? {}) as Record<string, unknown>,
          occurredAt: row.createdAt,
        }));

      // nextCursor from last row
      let nextCursor: string | null = null;
      if (rows.length === limit && rows.length > 0) {
        const last = rows[rows.length - 1];
        if (last) {
          nextCursor = `${last.createdAt.toISOString()}::${last.id}`;
        }
      }

      return Result.ok({ entries, nextCursor, total });
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}
