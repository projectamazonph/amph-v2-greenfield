import { Result } from "@/domain/shared/Result";

/**
 * `LiveClassRegistration` domain entity.
 *
 * STORY-091: a student's RSVP to a scheduled live class.
 *
 * Immutable — updates produce new instances via the helpers below.
 */

export type RegistrationStatus =
  | "registered"
  | "cancelled"
  | "attended"
  | "no_show";

const ALL_STATUSES: readonly RegistrationStatus[] = [
  "registered",
  "cancelled",
  "attended",
  "no_show",
];

export function isValidRegistrationStatus(
  s: string,
): s is RegistrationStatus {
  return (ALL_STATUSES as readonly string[]).includes(s);
}

export interface LiveClassRegistration {
  readonly id: string;
  readonly userId: string;
  readonly liveClassId: string;
  readonly status: RegistrationStatus;
  readonly registeredAt: Date;
  readonly cancelledAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateLiveClassRegistrationInput {
  id: string;
  userId: string;
  liveClassId: string;
}

export type LiveClassRegistrationError =
  | { kind: "invalid_id" }
  | { kind: "invalid_user_id" }
  | { kind: "invalid_live_class_id" };

export function createLiveClassRegistration(
  input: CreateLiveClassRegistrationInput,
): Result<LiveClassRegistration, LiveClassRegistrationError> {
  if (!input.id.trim()) {
    return Result.err({ kind: "invalid_id" });
  }
  if (!input.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }
  if (!input.liveClassId.trim()) {
    return Result.err({ kind: "invalid_live_class_id" });
  }
  const now = new Date();
  return Result.ok({
    id: input.id.trim(),
    userId: input.userId.trim(),
    liveClassId: input.liveClassId.trim(),
    status: "registered",
    registeredAt: now,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export function cancelRegistration(
  reg: LiveClassRegistration,
  now: Date = new Date(),
): LiveClassRegistration {
  return {
    ...reg,
    status: "cancelled",
    cancelledAt: now,
    updatedAt: now,
  };
}

export function rsvpAgain(
  reg: LiveClassRegistration,
  now: Date = new Date(),
): LiveClassRegistration {
  return {
    ...reg,
    status: "registered",
    cancelledAt: null,
    updatedAt: now,
  };
}