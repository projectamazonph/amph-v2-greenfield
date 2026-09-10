/**
 * InMemoryMaintenanceSettingRepository — fast in-memory fake for
 * IMaintenanceSettingRepository.
 *
 * P1-08 (P4 PR-A). Mirrors the singleton-row contract: getCurrent
 * returns null when nothing is seeded, upsert replaces by id.
 */

import { Result } from "@/domain/shared/Result";
import type {
  IMaintenanceSettingRepository,
  MaintenanceSettingError,
} from "@/ports/repositories/IMaintenanceSettingRepository";
import type { MaintenanceSetting } from "@/domain/entities/MaintenanceSetting";

export class InMemoryMaintenanceSettingRepository
  implements IMaintenanceSettingRepository
{
  private row: MaintenanceSetting | null = null;

  /** Test helper — seed an initial row before reading. */
  seed(setting: MaintenanceSetting): void {
    this.row = setting;
  }

  /** Test helper — clear the stored row. */
  clear(): void {
    this.row = null;
  }

  async getCurrent(): Promise<
    Result<MaintenanceSetting | null, MaintenanceSettingError>
  > {
    return Result.ok(this.row);
  }

  async upsert(
    setting: MaintenanceSetting,
  ): Promise<Result<void, MaintenanceSettingError>> {
    this.row = setting;
    return Result.ok(undefined);
  }
}