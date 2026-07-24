/**
 * ExportAuditLogs — fetch all audit log entries matching filters for CSV export.
 *
 * STORY-061. Fetches in pages of 100 to avoid loading the entire result
 * set into memory at once. The action/handler assembles the pages and
 * writes the CSV response.
 */

import type {
  IAuditLog,
  AuditLogError,
  AuditLogPage,
  AuditLogFilters,
} from "@/ports/repositories/IAuditLog";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";

export type ExportAuditLogsError = AuditLogError;

export interface ExportAuditLogsDeps {
  auditLog: IAuditLog;
}

export class ExportAuditLogs {
  constructor(private readonly deps: ExportAuditLogsDeps) {}

  /**
   * Fetch all entries for the given filters (no pagination), up to
   * `maxEntries` (default 10 000). Returns `{ entries, total }` where
   * `total` is the total matching count (may exceed `entries.length`).
   */
  async execute(params: {
    filters: AuditLogFilters;
    maxEntries?: number;
  }): Promise<
    | { ok: true; entries: AuditLogEntry[]; total: number }
    | { ok: false; error: ExportAuditLogsError }
  > {
    const maxEntries = params.maxEntries ?? 10_000;
    const BATCH = 100;

    let cursor: string | undefined;
    const allEntries: AuditLogEntry[] = [];

    // First pass: count (limit: 1, same filters)
    const countResult = await this.deps.auditLog.list({
      ...params.filters,
      limit: 1,
    });
    if (!countResult.ok) return countResult;
    const total = countResult.value.total;

    // Paginate until we have enough entries or run out
    while (allEntries.length < maxEntries) {
      const pageResult = await this.deps.auditLog.list({
        ...params.filters,
        cursor,
        limit: BATCH,
      });
      if (!pageResult.ok) return pageResult;

      const page: AuditLogPage = pageResult.value;
      allEntries.push(...page.entries);

      if (!page.nextCursor || page.entries.length < BATCH) break;
      cursor = page.nextCursor;
    }

    return { ok: true, entries: allEntries, total };
  }
}
