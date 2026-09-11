/**
 * Setting — admin-editable site configuration (P1-05).
 *
 * A key/value row where the value is opaque JSON. Keys are
 * lowercase dot/underscore names (`support_email`,
 * `checkout_notice`). Each consumer narrows the value it reads
 * and falls back when the row is missing or the shape is wrong —
 * settings must never crash a page.
 */

import { Result } from "@/domain/shared/Result";

const KEY_PATTERN = /^[a-z][a-z0-9_.]*$/;
export const MAX_KEY_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 280;

export interface Setting {
  readonly key: string;
  readonly value: unknown;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly createdById: string;
  readonly updatedById: string;
}

export type CreateSettingError =
  | { kind: "invalid_key" }
  | { kind: "invalid_value" }
  | { kind: "invalid_description" };

export function isSettingKey(value: string): boolean {
  return value.length > 0 && value.length <= MAX_KEY_LENGTH && KEY_PATTERN.test(value);
}

/**
 * Values must survive a JSON round trip, since Prisma stores them
 * as JSONB. Functions, symbols, and undefined fail the gate here
 * instead of corrupting the row.
 */
export function isJsonSerializable(value: unknown): boolean {
  try {
    const text = JSON.stringify(value);
    return text !== undefined;
  } catch {
    return false;
  }
}

export function createSetting(params: {
  key: string;
  value: unknown;
  description?: string | null;
  createdById: string;
  createdAt?: Date;
}): Result<Setting, CreateSettingError> {
  if (!isSettingKey(params.key)) {
    return Result.err({ kind: "invalid_key" });
  }
  if (!isJsonSerializable(params.value)) {
    return Result.err({ kind: "invalid_value" });
  }
  if (params.description !== undefined && params.description !== null) {
    if (params.description.length > MAX_DESCRIPTION_LENGTH) {
      return Result.err({ kind: "invalid_description" });
    }
  }
  const now = params.createdAt ?? new Date();
  return Result.ok({
    key: params.key,
    value: params.value,
    description: params.description ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: params.createdById,
    updatedById: params.createdById,
  });
}

export type UpdateSettingError = CreateSettingError;

/**
 * Replaces the value (and optionally the description) of an
 * existing row, stamping the actor and the write time.
 */
export function updateSetting(
  setting: Setting,
  params: {
    value: unknown;
    description?: string | null;
    updatedById: string;
    updatedAt: Date;
  },
): Result<Setting, UpdateSettingError> {
  if (!isJsonSerializable(params.value)) {
    return Result.err({ kind: "invalid_value" });
  }
  if (params.description !== undefined && params.description !== null) {
    if (params.description.length > MAX_DESCRIPTION_LENGTH) {
      return Result.err({ kind: "invalid_description" });
    }
  }
  return Result.ok({
    ...setting,
    value: params.value,
    description: params.description ?? setting.description,
    updatedById: params.updatedById,
    updatedAt: params.updatedAt,
  });
}
