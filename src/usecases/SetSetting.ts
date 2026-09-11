/**
 * SetSetting — admin saves a site setting (P1-05, PR-C slice 3).
 *
 * Upsert by key: an existing row is replaced with a fresh actor
 * stamp, a missing key is created. Every outcome is audited
 * (`setting.saved` / `setting.save_failed`).
 */

import { Result } from "@/domain/shared/Result";
import {
  createSetting,
  updateSetting,
  type CreateSettingError,
  type Setting,
} from "@/domain/entities/Setting";
import type { ISettingRepository } from "@/ports/repositories/ISettingRepository";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface SetSettingInput {
  actorId: string;
  key: string;
  value: unknown;
  description?: string | null;
}

export type SetSettingError =
  | CreateSettingError
  | { kind: "db_error"; message: string };

export type SetSettingResult = Result<Setting, SetSettingError>;

export interface SetSettingDeps {
  settingRepo: ISettingRepository;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class SetSetting {
  constructor(private readonly deps: SetSettingDeps) {}

  async execute(input: SetSettingInput): Promise<SetSettingResult> {
    const audit = (action: "setting.saved" | "setting.save_failed", metadata: Record<string, unknown>) =>
      this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action,
        targetType: "setting",
        targetId: input.key,
        metadata,
      });

    const now = this.deps.clock.now();
    const existing = await this.deps.settingRepo.get(input.key);
    if (!existing.ok) {
      await audit("setting.save_failed", {
        outcome: "db_error",
        message: existing.error.message,
      });
      return Result.err({ kind: "db_error", message: existing.error.message });
    }

    const built =
      existing.value === null
        ? createSetting({
            key: input.key,
            value: input.value,
            description: input.description ?? null,
            createdById: input.actorId,
            createdAt: now,
          })
        : updateSetting(existing.value, {
            value: input.value,
            description: input.description ?? null,
            updatedById: input.actorId,
            updatedAt: now,
          });
    if (!built.ok) {
      await audit("setting.save_failed", { outcome: built.error.kind });
      return Result.err(built.error);
    }

    const saved = await this.deps.settingRepo.upsert(built.value);
    if (!saved.ok) {
      await audit("setting.save_failed", {
        outcome: "db_error",
        message: saved.error.message,
      });
      return Result.err({ kind: "db_error", message: saved.error.message });
    }

    await audit("setting.saved", { outcome: "success", key: saved.value.key });
    return Result.ok(saved.value);
  }
}
