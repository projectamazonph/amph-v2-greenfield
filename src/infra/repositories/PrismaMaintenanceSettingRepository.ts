/**
 * PrismaMaintenanceSettingRepository — production adapter for
 * IMaintenanceSettingRepository.
 *
 * P1-08 (P4 PR-A). There is at most one logical row in the
 * `maintenance_settings` table. `upsert` uses a fixed primary key
 * ("current") so concurrent toggles still replace the same row
 * rather than racing into two rows. The "current" sentinel is the
 * same id the proxy looks up; the entity domain id is the row's
 * PK so we don't need a separate unique index.
 *
 * `deletedAt` is intentionally NOT consulted by `getCurrent` —
 * the kill switch must always read the latest row regardless of
 * soft-delete state. Soft-delete here only matters for an
 * out-of-band admin tool (not part of P1-08).
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IMaintenanceSettingRepository,
  MaintenanceSettingError,
} from "@/ports/repositories/IMaintenanceSettingRepository";
import type { MaintenanceSetting } from "@/domain/entities/MaintenanceSetting";

/** Stable PK for the singleton row. */
const CURRENT_ID = "current";

interface MaintenanceSettingRow {
  id: string;
  enabled: boolean;
  message: string | null;
  allowedAdminIds: string[];
  updatedAt: Date;
  updatedById: string | null;
}

export class PrismaMaintenanceSettingRepository
  implements IMaintenanceSettingRepository
{
  constructor(private readonly db: PrismaClient) {}

  async getCurrent(): Promise<
    Result<MaintenanceSetting | null, MaintenanceSettingError>
  > {
    try {
      const row = await this.db.maintenanceSetting.findUnique({
        where: { id: CURRENT_ID },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async upsert(
    setting: MaintenanceSetting,
  ): Promise<Result<void, MaintenanceSettingError>> {
    try {
      await this.db.maintenanceSetting.upsert({
        where: { id: setting.id },
        create: {
          id: setting.id,
          enabled: setting.enabled,
          message: setting.message,
          allowedAdminIds: [...setting.allowedAdminIds],
          updatedAt: setting.updatedAt,
          updatedById: setting.updatedById,
          createdById: setting.updatedById,
        },
        update: {
          enabled: setting.enabled,
          message: setting.message,
          allowedAdminIds: [...setting.allowedAdminIds],
          updatedAt: setting.updatedAt,
          updatedById: setting.updatedById,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: MaintenanceSettingRow): MaintenanceSetting {
    // Defensive: the DB column is nullable per the schema, but the
    // domain requires a non-empty updatedById. The first-ever row
    // is written by AdminToggleMaintenance with a valid actor id,
    // so this null branch only fires on a hand-edited DB row or
    // (hypothetically) a future bulk-import script. Surface as
    // "system" so the proxy never crashes on an empty string.
    const updatedById = row.updatedById ?? "system";
    return Object.freeze({
      id: row.id,
      enabled: row.enabled,
      message: row.message,
      allowedAdminIds: Object.freeze([...row.allowedAdminIds]) as readonly string[],
      updatedAt: row.updatedAt,
      updatedById,
    });
  }
}