/**
 * IAuditLog — port for persisting and querying audit log entries.
 *
 * STORY-050a (record). STORY-061 (list + export).
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type { AuditAction } from "@/domain/values/AuditAction";

export type AuditLogError = { kind: "db_error"; message: string };

// ── Filters for list ─────────────────────────────────────────────────────────

export interface AuditLogFilters {
  actorId?: string;
  action?: AuditAction;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
  /** Cursor from previous page: "{occurredAt.toISOString()}:{id}" */
  cursor?: string;
  /** Default 50, max 100 */
  limit?: number;
}

export interface AuditLogPage {
  entries: readonly AuditLogEntry[];
  nextCursor: string | null;
  total: number;
}

// ── Interface ────────────────────────────────────────────────────────────────

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
   * STORY-061. List audit log entries with optional filters and cursor pagination.
   * Returns a page of entries ordered by occurredAt desc.
   */
  list(filters: AuditLogFilters): Promise<Result<AuditLogPage, AuditLogError>>;
}
