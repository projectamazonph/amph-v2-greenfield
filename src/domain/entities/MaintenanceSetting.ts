/**
 * MaintenanceSetting — P1-08 (P4 PR-A).
 *
 * The current state of the maintenance-mode kill switch. There is at
 * most one logical instance at a time, although the storage layer is
 * permitted to keep a `deletedAt`-soft-deleted row around for audit
 * traceability (the next read materialises a fresh row when none
 * exists).
 *
 * Domain rules:
 * - `id` is non-empty (the row's primary key, also used in the audit
 *   log targetId so an entry survives multiple toggles unambiguously).
 * - `enabled` is a boolean — `true` means "serve 503 to everyone
 *   except admins with the bypass", `false` means "normal operation".
 * - `message` may be null (the 503 page falls back to a default
 *   message) but never an empty string when present.
 * - `allowedAdminIds` is a frozen list of user ids. The middleware
 *   honours this list as well as the MAINTENANCE_BYPASS_TOKEN env
 *   override. An empty array means "no admin can reach the app
 *   during maintenance unless they hold the bypass token" — which
 *   is the safe default, because the env override is what
 *   `AdminToggleMaintenance` sets.
 * - `updatedById` is the admin's user id who last changed the row;
 *   required for audit attribution.
 */

import { Result } from "@/domain/shared/Result";

export interface MaintenanceSetting {
  readonly id: string;
  readonly enabled: boolean;
  readonly message: string | null;
  readonly allowedAdminIds: readonly string[];
  readonly updatedAt: Date;
  readonly updatedById: string;
}

export type MaintenanceSettingError =
  | { kind: "invalid_input"; message: string };

export interface CreateMaintenanceSettingParams {
  id: string;
  enabled: boolean;
  message?: string | null;
  allowedAdminIds?: readonly string[];
  updatedById: string;
  updatedAt?: Date;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_ADMIN_IDS = 50;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Domain factory: build a new MaintenanceSetting.
 *
 * Trims and validates every input. The id, updatedById and every
 * allowedAdminIds entry are checked against `ID_PATTERN` so a
 * malicious or malformed row can never reach the DB. message is
 * trimmed; an empty trimmed value is normalised to null (the UI
 * shows a default message). updatedAt defaults to "now"; the use
 * case is expected to pass an explicit clock-supplied Date to keep
 * the timestamp deterministic in tests.
 */
export function createMaintenanceSetting(
  params: CreateMaintenanceSettingParams,
): Result<MaintenanceSetting, MaintenanceSettingError> {
  if (!ID_PATTERN.test(params.id)) {
    return Result.err({ kind: "invalid_input", message: "id is required" });
  }
  if (!ID_PATTERN.test(params.updatedById)) {
    return Result.err({ kind: "invalid_input", message: "updatedById is required" });
  }

  let message: string | null = null;
  if (params.message !== undefined && params.message !== null) {
    const trimmed = params.message.trim();
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return Result.err({
        kind: "invalid_input",
        message: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
      });
    }
    message = trimmed.length > 0 ? trimmed : null;
  }

  const allowedAdminIds = params.allowedAdminIds ?? [];
  if (allowedAdminIds.length > MAX_ADMIN_IDS) {
    return Result.err({
      kind: "invalid_input",
      message: `allowedAdminIds must contain at most ${MAX_ADMIN_IDS} ids`,
    });
  }
  const seen = new Set<string>();
  const cleanedIds: string[] = [];
  for (const candidate of allowedAdminIds) {
    if (!ID_PATTERN.test(candidate)) {
      return Result.err({
        kind: "invalid_input",
        message: `allowedAdminIds contains an invalid id: ${candidate}`,
      });
    }
    if (!seen.has(candidate)) {
      seen.add(candidate);
      cleanedIds.push(candidate);
    }
  }

  return Result.ok(
    Object.freeze({
      id: params.id,
      enabled: params.enabled,
      message,
      allowedAdminIds: Object.freeze(cleanedIds) as readonly string[],
      updatedAt: params.updatedAt ?? new Date(),
      updatedById: params.updatedById,
    }),
  );
}

/**
 * Apply a toggle to an existing MaintenanceSetting. Returns a new
 * frozen instance — the original is left untouched (entity is
 * immutable, per the project's domain conventions).
 *
 * `newEnabled` may equal the current value (the use case still
 * rewrites the row + audit log entry to record that the admin
 * re-confirmed the state). `newMessage` may be `undefined` to leave
 * the message alone, `null` to clear it, or a string to set it.
 */
export function toggleMaintenanceSetting(
  current: MaintenanceSetting,
  patch: {
    enabled: boolean;
    message?: string | null;
    allowedAdminIds?: readonly string[];
    updatedById: string;
    updatedAt?: Date;
  },
): Result<MaintenanceSetting, MaintenanceSettingError> {
  if (!ID_PATTERN.test(patch.updatedById)) {
    return Result.err({ kind: "invalid_input", message: "updatedById is required" });
  }

  let nextMessage: string | null = current.message;
  if (patch.message !== undefined) {
    if (patch.message === null) {
      nextMessage = null;
    } else {
      const trimmed = patch.message.trim();
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        return Result.err({
          kind: "invalid_input",
          message: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
        });
      }
      nextMessage = trimmed.length > 0 ? trimmed : null;
    }
  }

  const nextAllowedIds =
    patch.allowedAdminIds !== undefined
      ? patch.allowedAdminIds
      : current.allowedAdminIds;

  return createMaintenanceSetting({
    id: current.id,
    enabled: patch.enabled,
    message: nextMessage,
    allowedAdminIds: nextAllowedIds,
    updatedById: patch.updatedById,
    updatedAt: patch.updatedAt ?? new Date(),
  });
}

/**
 * Convenience predicate used by the proxy — a request qualifies for
 * the admin override if the supplied user id is in `allowedAdminIds`.
 * Callers should consult this BEFORE the request handler decides
 * whether to bypass the 503.
 */
export function isAdminAllowed(
  setting: MaintenanceSetting,
  userId: string,
): boolean {
  return setting.allowedAdminIds.includes(userId);
}

/**
 * Convenience accessor for the proxy's 503 page. The DB may store
 * `null` to indicate "no admin-supplied message"; the page falls
 * back to a default banner explaining the maintenance window.
 */
export function getMaintenanceMessage(
  setting: MaintenanceSetting,
): string | null {
  return setting.message;
}