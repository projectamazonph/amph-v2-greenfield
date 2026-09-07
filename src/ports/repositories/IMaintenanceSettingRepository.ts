/**
 * IMaintenanceSettingRepository — port for persisting the
 * maintenance-mode kill switch.
 *
 * P1-08 (P4 PR-A). The store holds at most one logical row at a
 * time. Reads always return the current state (or a default
 * `enabled=false` value when the table is empty); writes always
 * replace the row in place.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type { MaintenanceSetting } from "@/domain/entities/MaintenanceSetting";

export type MaintenanceSettingError = { kind: "db_error"; message: string };

export interface IMaintenanceSettingRepository {
  /**
   * Returns the current maintenance setting, or `null` if no row
   * exists yet (the proxy treats a missing row as "maintenance off").
   */
  getCurrent(): Promise<Result<MaintenanceSetting | null, MaintenanceSettingError>>;

  /**
   * Insert-or-replace the single maintenance row. The caller is
   * responsible for having built a validated entity via
   * `createMaintenanceSetting` or `toggleMaintenanceSetting`; the
   * repo trusts the entity it receives.
   */
  upsert(
    setting: MaintenanceSetting,
  ): Promise<Result<void, MaintenanceSettingError>>;
}