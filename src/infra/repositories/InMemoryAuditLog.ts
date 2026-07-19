/**
 * InMemoryAuditLog — fast in-memory adapter for IAuditLog.
 *
 * STORY-050a. Used in tests + in prod (the prod container falls back
 * to the in-memory adapter for audit logs since there's no Prisma
 * AuditLog table yet — see STORY-050a out-of-scope for the Prisma
 * schema migration).
 */

import { Result } from "@/domain/shared/Result";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type { IAuditLog, AuditLogError } from "@/ports/repositories/IAuditLog";

export class InMemoryAuditLog implements IAuditLog {
  private entries: AuditLogEntry[] = [];

  async record(entry: AuditLogEntry): Promise<Result<void, AuditLogError>> {
    this.entries.push(entry);
    return Result.ok(undefined);
  }

  /** Test helper. */
  getAll(): readonly AuditLogEntry[] {
    return [...this.entries];
  }

  /** Test helper. */
  clear(): void {
    this.entries = [];
  }
}
