/**
 * GetMaintenanceStatus — P1-08 (P4 PR-A).
 *
 * Public use case. Reads the current maintenance setting. The
 * proxy (`src/proxy.ts`) calls this on every request — keep the
 * dependency surface minimal and the error path quiet: a missing
 * row is a valid "no" answer and a DB error is logged but never
 * blocks the user (the proxy falls back to "maintenance off" so
 * a transient DB outage cannot lock everyone out via a hard 503).
 */

import { Result } from "@/domain/shared/Result";
import type { IMaintenanceSettingRepository } from "@/ports/repositories/IMaintenanceSettingRepository";
import type { MaintenanceSetting } from "@/domain/entities/MaintenanceSetting";

export interface GetMaintenanceStatusDeps {
  maintenanceRepo: IMaintenanceSettingRepository;
}

/**
 * A short-lived cached view of the maintenance state, optimised
 * for the proxy hot path. A missing row is represented by
 * `enabled: false` so callers can treat both "no row" and "row
 * with enabled=false" as the same case.
 */
export interface MaintenanceStatusView {
  enabled: boolean;
  message: string | null;
  allowedAdminIds: readonly string[];
  updatedAt: Date | null;
  updatedById: string | null;
}

export type GetMaintenanceStatusError = { kind: "db_error"; message: string };

export class GetMaintenanceStatus {
  constructor(private readonly deps: GetMaintenanceStatusDeps) {}

  async execute(): Promise<
    Result<MaintenanceStatusView, GetMaintenanceStatusError>
  > {
    const result = await this.deps.maintenanceRepo.getCurrent();
    if (!result.ok) {
      return Result.err({
        kind: "db_error",
        message: result.error.message,
      });
    }
    return Result.ok(toView(result.value));
  }

  /**
   * Same logic as `execute` but returns a safe default view
   * (`enabled: false`) on error rather than a Result. The proxy
   * uses this so a transient DB outage cannot lock everyone out
   * — a failed read degrades gracefully to "the site is up".
   *
   * Tests should prefer `execute` so they assert on the error
   * surface; this method is for production-only resilience.
   */
  async executeSafe(defaultView: MaintenanceStatusView): Promise<MaintenanceStatusView> {
    const result = await this.execute();
    if (!result.ok) return defaultView;
    return result.value;
  }
}

export function toView(setting: MaintenanceSetting | null): MaintenanceStatusView {
  if (!setting) {
    return {
      enabled: false,
      message: null,
      allowedAdminIds: [],
      updatedAt: null,
      updatedById: null,
    };
  }
  return {
    enabled: setting.enabled,
    message: setting.message,
    allowedAdminIds: setting.allowedAdminIds,
    updatedAt: setting.updatedAt,
    updatedById: setting.updatedById,
  };
}