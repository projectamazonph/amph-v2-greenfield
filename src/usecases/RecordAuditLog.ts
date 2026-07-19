/**
 * RecordAuditLog — record a single audit log entry.
 *
 * STORY-050a.
 *
 * CRITICAL: this use case **never returns an error**. If the audit
 * log write fails (invalid input, db_error), we log to console.error
 * and return `{ recorded: false }`. A failed audit log must never
 * fail the business operation.
 *
 * Returns a plain object (not a Result) because the use case can
 * never fail — using Result<..., never> requires awkward `as` casts.
 */

import { createAuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type { AuditAction } from "@/domain/values/AuditAction";
import type { IAuditLog } from "@/ports/repositories/IAuditLog";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface RecordAuditLogInput {
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface RecordAuditLogResult {
  recorded: boolean;
}

export interface RecordAuditLogDeps {
  auditLog: IAuditLog;
  idGen: IdGenerator;
  clock: Clock;
}

export class RecordAuditLog {
  constructor(private readonly deps: RecordAuditLogDeps) {}

  async execute(input: RecordAuditLogInput): Promise<RecordAuditLogResult> {
    const id = this.deps.idGen.newId();
    const occurredAt = this.deps.clock.now();

    const buildResult = createAuditLogEntry({
      id,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      occurredAt,
    });

    if (!buildResult.ok) {
      // eslint-disable-next-line no-console
      console.error(
        "[RecordAuditLog] invalid input, skipping record:",
        buildResult.error,
      );
      return { recorded: false };
    }

    const recordResult = await this.deps.auditLog.record(buildResult.value);
    if (!recordResult.ok) {
      // eslint-disable-next-line no-console
      console.error(
        "[RecordAuditLog] failed to persist entry, swallowing error:",
        recordResult.error,
      );
      return { recorded: false };
    }

    return { recorded: true };
  }
}
