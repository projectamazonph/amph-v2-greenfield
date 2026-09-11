/**
 * ListSettings — admin view of every site setting (P1-05, PR-C slice 3).
 *
 * Read model: no audit writes.
 */

import { Result } from "@/domain/shared/Result";
import type { Setting } from "@/domain/entities/Setting";
import type {
  ISettingRepository,
  SettingRepoError,
} from "@/ports/repositories/ISettingRepository";

export type ListSettingsResult = Result<{ rows: readonly Setting[] }, SettingRepoError>;

export interface ListSettingsDeps {
  settingRepo: ISettingRepository;
}

export class ListSettings {
  constructor(private readonly deps: ListSettingsDeps) {}

  async execute(): Promise<ListSettingsResult> {
    const listed = await this.deps.settingRepo.listAll();
    if (Result.isErr(listed)) {
      return Result.err(listed.error);
    }
    return Result.ok({ rows: listed.value });
  }
}
