/**
 * PrismaAuditLog — production Prisma adapter for IAuditLog.
 *
 * STORY-050a. STUB: throws on every method.
 *
 * The Prisma AuditLog table doesn't exist yet. When the schema
 * migration lands, this stub gets a real implementation that
 * mirrors the InMemoryAuditLog (same contract).
 *
 * Until then, the prod container falls back to InMemoryAuditLog
 * (see container.ts).
 */

import type { Result } from "@/domain/shared/Result";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type { IAuditLog, AuditLogError } from "@/ports/repositories/IAuditLog";

function notImplemented(): never {
  throw new Error(
    "PrismaAuditLog is not implemented yet. " +
      "The Prisma AuditLog schema migration is a follow-up. " +
      "The prod container falls back to InMemoryAuditLog.",
  );
}

export class PrismaAuditLog implements IAuditLog {
  async record(_entry: AuditLogEntry): Promise<Result<void, AuditLogError>> {
    notImplemented();
  }
}
