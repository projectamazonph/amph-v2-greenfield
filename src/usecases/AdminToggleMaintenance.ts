/**
 * AdminToggleMaintenance — P1-08 (P4 PR-A).
 *
 * Admin-only use case. Flips the maintenance-mode kill switch and
 * writes an audit log entry (action: "maintenance.toggled"). The
 * row is upserted by id; an empty table becomes a single row with
 * id "current" on first toggle.
 *
 * Authorisation is delegated to the caller (`requireAdmin` in the
 * server action / page). The use case itself trusts the actor id
 * it receives — same shape as every other admin use case in the
 * codebase.
 */

import { Result } from "@/domain/shared/Result";
import { createMaintenanceSetting, toggleMaintenanceSetting } from "@/domain/entities/MaintenanceSetting";
import type { MaintenanceSetting } from "@/domain/entities/MaintenanceSetting";
import type { IMaintenanceSettingRepository } from "@/ports/repositories/IMaintenanceSettingRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { Clock } from "@/ports/system/Clock";

export interface AdminToggleMaintenanceInput {
  /** Caller's admin user id — recorded as the toggle's actor. */
  actorId: string;
  enabled: boolean;
  message?: string | null;
  allowedAdminIds?: readonly string[];
}

export interface AdminToggleMaintenanceDeps {
  maintenanceRepo: IMaintenanceSettingRepository;
  recordAuditLog: RecordAuditLog;
  clock: Clock;
}

export type AdminToggleMaintenanceError =
  | { kind: "invalid_input"; message: string }
  | { kind: "db_error"; message: string };

export type AdminToggleMaintenanceResult = Result<
  MaintenanceSetting,
  AdminToggleMaintenanceError
>;

/**
 * Stable primary key for the singleton row.
 *
 * The repo's getCurrent/upsert both key on this id. The id is
 * also the audit log's targetId so a row's history is
 * unambiguous even after a future schema change that allows
 * multiple maintenance windows.
 */
const SETTING_ID = "current";

export class AdminToggleMaintenance {
  constructor(private readonly deps: AdminToggleMaintenanceDeps) {}

  async execute(
    input: AdminToggleMaintenanceInput,
  ): Promise<AdminToggleMaintenanceResult> {
    const now = this.deps.clock.now();

    const currentResult = await this.deps.maintenanceRepo.getCurrent();
    if (!currentResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "maintenance.toggled",
        targetType: "maintenance",
        targetId: SETTING_ID,
        metadata: {
          outcome: "db_error",
          enabled: input.enabled,
          message: currentResult.error.message,
        },
      });
      return Result.err({
        kind: "db_error",
        message: currentResult.error.message,
      });
    }

    const nextResult = currentResult.value
      ? toggleMaintenanceSetting(currentResult.value, {
          enabled: input.enabled,
          message: input.message,
          allowedAdminIds: input.allowedAdminIds,
          updatedById: input.actorId,
          updatedAt: now,
        })
      : createMaintenanceSetting({
          id: SETTING_ID,
          enabled: input.enabled,
          message: input.message ?? null,
          allowedAdminIds: input.allowedAdminIds ?? [],
          updatedById: input.actorId,
          updatedAt: now,
        });

    if (!nextResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "maintenance.toggled",
        targetType: "maintenance",
        targetId: SETTING_ID,
        metadata: {
          outcome: "invalid_input",
          enabled: input.enabled,
          message: nextResult.error.message,
        },
      });
      return Result.err(nextResult.error);
    }

    const upsertResult = await this.deps.maintenanceRepo.upsert(nextResult.value);
    if (!upsertResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "maintenance.toggled",
        targetType: "maintenance",
        targetId: SETTING_ID,
        metadata: {
          outcome: "db_error",
          enabled: input.enabled,
          message: upsertResult.error.message,
        },
      });
      return Result.err({
        kind: "db_error",
        message: upsertResult.error.message,
      });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "maintenance.toggled",
      targetType: "maintenance",
      targetId: SETTING_ID,
      metadata: {
        outcome: "success",
        enabled: input.enabled,
        message: nextResult.value.message,
        allowedAdminIds: [...nextResult.value.allowedAdminIds],
      },
    });

    return Result.ok(nextResult.value);
  }
}