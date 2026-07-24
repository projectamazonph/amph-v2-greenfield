/**
 * ListAuditLogs — paginated audit log entry list for the admin UI.
 *
 * STORY-061.
 */

import { Result } from "@/domain/shared/Result";
import type {
  IAuditLog,
  AuditLogError,
  AuditLogFilters,
  AuditLogPage,
} from "@/ports/repositories/IAuditLog";

export type ListAuditLogsError = AuditLogError;

export type ListAuditLogsResult = Result<AuditLogPage, ListAuditLogsError>;

export interface ListAuditLogsDeps {
  auditLog: IAuditLog;
}

export class ListAuditLogs {
  constructor(private readonly deps: ListAuditLogsDeps) {}

  async execute(params: { filters: AuditLogFilters }): Promise<ListAuditLogsResult> {
    return this.deps.auditLog.list(params.filters);
  }
}
