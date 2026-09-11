/**
 * ISettingRepository — port for the site settings store.
 *
 * P1-05 (PR-C slice 3). Entities in, entities out: the SetSetting
 * use case builds and validates the Setting entity before
 * persisting. Reads never fail with `not_found`: a missing key is
 * a null, and every consumer carries its own fallback.
 *
 * Implementations: PrismaSettingRepository (prod),
 * InMemorySettingRepository (tests).
 *
 * ADR-014: every port method returns Result<T, E>. No exceptions
 * across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { Setting } from "@/domain/entities/Setting";

export type SettingRepoError = { kind: "db_error"; message: string };

export interface ISettingRepository {
  /**
   * The row for a key, or null when nobody saved it yet.
   * Consumers fall back to their hardcoded default on null.
   */
  get(key: string): Promise<Result<Setting | null, SettingRepoError>>;

  /** Every live row, ordered by key. Soft-deleted rows are excluded. */
  listAll(): Promise<Result<readonly Setting[], SettingRepoError>>;

  /**
   * Insert or replace the row for the setting's key.
   * Postconditions: `get` returns the saved value afterwards.
   */
  upsert(setting: Setting): Promise<Result<Setting, SettingRepoError>>;
}
