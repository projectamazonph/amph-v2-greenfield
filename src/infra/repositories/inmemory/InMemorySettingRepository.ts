/**
 * InMemorySettingRepository — test fake for ISettingRepository.
 *
 * P1-05 (PR-C slice 3). Stores Setting entities in a Map, keyed by
 * key. Mirrors the Prisma adapter's contracts: missing keys read
 * as null, upsert replaces by key, listAll orders by key.
 */

import { Result } from "@/domain/shared/Result";
import type { Setting } from "@/domain/entities/Setting";
import type {
  ISettingRepository,
  SettingRepoError,
} from "@/ports/repositories/ISettingRepository";

export class InMemorySettingRepository implements ISettingRepository {
  private readonly rows = new Map<string, Setting>();

  async get(key: string): Promise<Result<Setting | null, SettingRepoError>> {
    const row = this.rows.get(key);
    if (!row || row.deletedAt !== null) return Result.ok(null);
    return Result.ok(row);
  }

  async listAll(): Promise<Result<readonly Setting[], SettingRepoError>> {
    const rows = Array.from(this.rows.values())
      .filter((row) => row.deletedAt === null)
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    return Result.ok(rows);
  }

  async upsert(setting: Setting): Promise<Result<Setting, SettingRepoError>> {
    this.rows.set(setting.key, setting);
    return Result.ok(setting);
  }

  /** Test helper: seed a row directly, bypassing the port. */
  seed(setting: Setting): void {
    this.rows.set(setting.key, setting);
  }

  /** Test helper: clear all rows. */
  clear(): void {
    this.rows.clear();
  }
}
