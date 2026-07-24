/**
 * InMemoryAuditLog — fast in-memory adapter for IAuditLog.
 *
 * STORY-050a (record). STORY-061 (list).
 */

import { Result } from "@/domain/shared/Result";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type {
  IAuditLog,
  AuditLogError,
  AuditLogFilters,
  AuditLogPage,
} from "@/ports/repositories/IAuditLog";

export class InMemoryAuditLog implements IAuditLog {
  private entries: AuditLogEntry[] = [];

  async record(entry: AuditLogEntry): Promise<Result<void, AuditLogError>> {
    this.entries.push(entry);
    return Result.ok(undefined);
  }

  async list(filters: AuditLogFilters): Promise<Result<AuditLogPage, AuditLogError>> {
    const limit = Math.min(filters.limit ?? 50, 100);

    // Decode cursor: "{occurredAt.toISOString()}::{id}"
    // (double-colon separator avoids collision with ISO timestamp colons)
    let cursorMs: number | null = null;
    let cursorId: string | null = null;
    if (filters.cursor) {
      const separatorIdx = filters.cursor.indexOf("::");
      if (separatorIdx > 0) {
        const ts = filters.cursor.slice(0, separatorIdx);
        cursorId = filters.cursor.slice(separatorIdx + 2);
        cursorMs = new Date(ts).getTime();
      }
    }

    // Filter
    let filtered = this.entries.filter((e) => {
      if (filters.actorId && e.actorId !== filters.actorId) return false;
      if (filters.action && e.action !== filters.action) return false;
      if (filters.targetType && e.targetType !== filters.targetType) return false;
      if (filters.targetId && e.targetId !== filters.targetId) return false;
      if (filters.from && e.occurredAt < filters.from) return false;
      if (filters.to && e.occurredAt > filters.to) return false;
      return true;
    });

    // Sort: occurredAt desc, id desc (same as Prisma compound cursor)
    filtered.sort((a, b) => {
      const timeCmp = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (timeCmp !== 0) return timeCmp;
      return b.id.localeCompare(a.id);
    });

    // Total before cursor skip (so total reflects all matching, not just this page)
    const total = filtered.length;

    // Cursor skip: exclude entries at/after the cursor position
    if (cursorMs !== null && cursorId !== null) {
      filtered = filtered.filter((e) => {
        const eMs = e.occurredAt.getTime();
        if (eMs < cursorMs!) return true;
        if (eMs > cursorMs!) return false;
        // Same millisecond — exclude entries with id >= cursorId (desc sort)
        return e.id.localeCompare(cursorId!) < 0;
      });
    }

    const pageEntries = filtered.slice(0, limit);

    // Build nextCursor from last entry if there's a next page
    let nextCursor: string | null = null;
    if (pageEntries.length === limit && filtered.length > limit) {
      const last = pageEntries[pageEntries.length - 1];
      if (last) {
        nextCursor = `${last.occurredAt.toISOString()}::${last.id}`;
      }
    }

    return Result.ok({ entries: pageEntries, nextCursor, total });
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
