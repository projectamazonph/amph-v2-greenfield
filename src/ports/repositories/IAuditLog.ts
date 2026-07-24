/**
 * IAuditLog — port for persisting and reading audit log entries.
 *
 * STORY-050a. The port started write-only; STORY-061 adds the reader.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type { AuditAction } from "@/domain/values/AuditAction";

export type AuditLogError = { kind: "db_error"; message: string };

/** STORY-061: filters for listing audit log entries. */
export interface AuditLogFilters {
  actorId?: string;
  action?: AuditAction;
  targetType?: string;
  targetId?: string;
  /** Inclusive start of the date range (UTC). */
  from?: Date;
  /** Inclusive end of the date range (UTC). */
  to?: Date;
  /** Cursor for pagination — an opaque string encoding (createdAt, id). */
  cursor?: string;
  /** Number of rows to return. Default: 50. Max: 100. */
  limit?: number;
}

/** STORY-061: a paginated page of audit log entries. */
export interface AuditLogPage {
  entries: readonly AuditLogEntry[];
  /** Opaque cursor for the next page. null when there are no more rows. */
  nextCursor: string | null;
  /** Total number of rows matching the filters (before pagination). */
  total: number;
}

export interface IAuditLog {
  /**
   * Persist a single audit log entry. Returns `db_error` if the
   * underlying store fails.
   *
   * NOTE: callers (specifically `RecordAuditLog` use case) should
   * swallow `db_error` and log to console.error — a failed audit
   * log write must not fail the business operation.
   */
  record(entry: AuditLogEntry): Promise<Result<void, AuditLogError>>;

  /**
   * List audit log entries with optional filters and cursor-based
   * pagination. Results are sorted by `occurredAt` descending
   * (most recent first).
   */
  list(filters: AuditLogFilters): Promise<Result<AuditLogPage, AuditLogError>>;
}
