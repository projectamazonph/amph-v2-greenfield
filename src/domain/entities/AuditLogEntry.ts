/**
 * AuditLogEntry — a single audit log record.
 *
 * STORY-050a. Records who did what to which thing, when, and
 * (optionally) a small bag of metadata. The metadata is intentionally
 * not strongly typed: it varies by action (e.g. refund override
 * needs `overrideReason`; course update needs a diff).
 *
 * Domain rules:
 * - actorId must be non-empty (who did it)
 * - action must be a valid AuditAction
 * - targetType must be non-empty (e.g. "course", "module", "order")
 * - targetId must be non-empty (the id of the affected entity)
 * - id must be non-empty
 * - occurredAt must be a valid Date
 */

import { Result } from "@/domain/shared/Result";
import type { AuditAction } from "@/domain/values/AuditAction";

export interface AuditLogEntry {
  readonly id: string;
  readonly actorId: string;
  readonly action: AuditAction;
  readonly targetType: string;
  readonly targetId: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
}

export type AuditLogEntryError =
  | { kind: "invalid_input"; message: string };

export interface CreateAuditLogEntryParams {
  id: string;
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Readonly<Record<string, unknown>>;
  occurredAt: Date;
}

export function createAuditLogEntry(
  params: CreateAuditLogEntryParams,
): Result<AuditLogEntry, AuditLogEntryError> {
  if (!params.id.trim()) {
    return Result.err({ kind: "invalid_input", message: "id is required" });
  }
  if (!params.actorId.trim()) {
    return Result.err({ kind: "invalid_input", message: "actorId is required" });
  }
  if (!params.targetType.trim()) {
    return Result.err({ kind: "invalid_input", message: "targetType is required" });
  }
  if (!params.targetId.trim()) {
    return Result.err({ kind: "invalid_input", message: "targetId is required" });
  }
  if (!(params.occurredAt instanceof Date) || Number.isNaN(params.occurredAt.getTime())) {
    return Result.err({ kind: "invalid_input", message: "occurredAt must be a valid Date" });
  }
  return Result.ok({
    id: params.id.trim(),
    actorId: params.actorId.trim(),
    action: params.action,
    targetType: params.targetType.trim(),
    targetId: params.targetId.trim(),
    metadata: params.metadata ?? {},
    occurredAt: params.occurredAt,
  });
}
