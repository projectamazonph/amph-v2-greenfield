/**
 * PrismaSettingRepository — production adapter for ISettingRepository.
 *
 * P1-05 (PR-C slice 3). The domain value is opaque `unknown`; the
 * adapter round-trips it through JSON text on the way in (the entity
 * already gated serializability) and surfaces the stored JsonValue
 * as unknown on the way out. Each consumer narrows what it reads.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { Setting } from "@/domain/entities/Setting";
import type {
  ISettingRepository,
  SettingRepoError,
} from "@/ports/repositories/ISettingRepository";

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

/**
 * Encode a validated-serializable value for the Json column. The
 * round trip normalizes class instances to plain data; the entity
 * gate makes the parse infallible in practice, and the throw
 * documents the invariant for the one caller that skips it.
 */
function toInputJson(value: unknown): Prisma.InputJsonValue {
  const text = JSON.stringify(value);
  if (text === undefined) {
    throw new Error("Setting value is not JSON-serializable");
  }
  return JSON.parse(text) as Prisma.InputJsonValue;
}

export class PrismaSettingRepository implements ISettingRepository {
  constructor(private readonly db: PrismaClient) {}

  async get(key: string): Promise<Result<Setting | null, SettingRepoError>> {
    try {
      const row = await this.db.setting.findFirst({
        where: { key, deletedAt: null },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row as SettingRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(): Promise<Result<readonly Setting[], SettingRepoError>> {
    try {
      const rows = await this.db.setting.findMany({
        where: { deletedAt: null },
        orderBy: { key: "asc" },
      });
      return Result.ok(rows.map((row) => this.mapRow(row as SettingRow)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async upsert(setting: Setting): Promise<Result<Setting, SettingRepoError>> {
    try {
      const row = await this.db.setting.upsert({
        where: { key: setting.key },
        create: {
          key: setting.key,
          value: toInputJson(setting.value),
          description: setting.description,
          createdById: setting.createdById,
          updatedById: setting.updatedById,
        },
        update: {
          value: toInputJson(setting.value),
          description: setting.description,
          updatedById: setting.updatedById,
        },
      });
      return Result.ok(this.mapRow(row as SettingRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: SettingRow): Setting {
    return {
      key: row.key,
      value: row.value,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      // Actor ids are bare nullable TEXT (W0-01 convention). A null
      // means the row predates actor stamping; surface it as an
      // empty stamp rather than failing hydration.
      createdById: row.createdById ?? "",
      updatedById: row.updatedById ?? "",
    };
  }
}
