/**
 * GetSetting — read one site setting with a caller default (P1-05, PR-C slice 3).
 *
 * Read model: no audit writes. A missing row or a lookup failure
 * resolves to the caller's default so settings can never crash a
 * page — the 503 maintenance page depends on this.
 */

import { Result } from "@/domain/shared/Result";
import type { ISettingRepository } from "@/ports/repositories/ISettingRepository";

export interface GetSettingInput<T> {
  key: string;
  /** Narrow the stored value; return null when the shape is wrong. */
  narrow: (value: unknown) => T | null;
  defaultValue: T;
}

export interface GetSettingDeps {
  settingRepo: ISettingRepository;
}

export class GetSetting {
  constructor(private readonly deps: GetSettingDeps) {}

  async execute(input: GetSettingInput<string>): Promise<Result<string, never>>;
  async execute<T>(input: GetSettingInput<T>): Promise<Result<T, never>>;
  async execute(input: GetSettingInput<unknown>): Promise<Result<unknown, never>> {
    const found = await this.deps.settingRepo.get(input.key);
    if (!found.ok || found.value === null) {
      return Result.ok(input.defaultValue);
    }
    const narrowed = input.narrow(found.value.value);
    return Result.ok(narrowed === null ? input.defaultValue : narrowed);
  }
}
