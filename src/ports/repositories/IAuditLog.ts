/**
 * IAuditLog — port for persisting audit log entries.
 *
 * STORY-050a. The port is intentionally read-light (no list/get
 * methods yet) — the reader is a follow-up.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type { AuditLogEntry } from "@/domain/entities/AuditLogEntry";

export type AuditLogError =
  | { kind: "db_error"; message: string };

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
}
