/**
 * PrismaAuditLog — production Prisma adapter for IAuditLog.
 *
 * P0-2 follow-up: every admin write (course/module/lesson CRUD, refund
 * overrides, discount codes, badges, simulator scenarios, live classes,
 * impersonation) calls `RecordAuditLog`, which was silently writing to
 * `InMemoryAuditLog` in production — the entire audit trail vanished on
 * every cold start / redeploy. `RecordAuditLog` never fails the business
 * operation on a write error, so this was invisible until someone went
 * looking for a trail that wasn't there.
 *
 * The domain `AuditLogEntry` doesn't carry `actorType` or `ipAddress` —
 * those columns exist on the Prisma model for future use but have no
 * source in the current domain model, so they're left at the schema
 * default / null here, same limitation pattern as `PrismaCourseRepository`
 * documents for `curriculum`/`status`.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type { IAuditLog, AuditLogError } from "@/ports/repositories/IAuditLog";

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
}
