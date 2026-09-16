/**
 * Notification — in-app learner/admin signal (P3-87).
 *
 * Types: course_complete, artefact_submitted, enrollment_welcome,
 * refund_requested, announcement. The bell (NotificationBell) reads
 * unread-first; clicking an item marks it read. Emits originate in
 * server actions (markLessonCompleteAction for course_complete);
 * future emits reuse NotifyUser without touching this module.
 */

import { Result } from "@/domain/shared/Result";

export type NotificationType =
  | "course_complete"
  | "artefact_submitted"
  | "enrollment_welcome"
  | "refund_requested"
  | "announcement";

const ALL_TYPES: readonly NotificationType[] = [
  "course_complete",
  "artefact_submitted",
  "enrollment_welcome",
  "refund_requested",
  "announcement",
];

export function isNotificationType(value: string): value is NotificationType {
  return (ALL_TYPES as readonly string[]).includes(value);
}

export interface Notification {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly createdById: string;
  readonly updatedById: string;
}

export type CreateNotificationError =
  | { kind: "invalid_user_id" }
  | { kind: "invalid_type" }
  | { kind: "invalid_title" }
  | { kind: "invalid_body" };

export function createNotification(params: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  createdById: string;
  createdAt?: Date;
}): Result<Notification, CreateNotificationError> {
  if (!params.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }
  if (!isNotificationType(params.type)) {
    return Result.err({ kind: "invalid_type" });
  }
  if (!params.title.trim()) {
    return Result.err({ kind: "invalid_title" });
  }
  if (!params.body.trim()) {
    return Result.err({ kind: "invalid_body" });
  }
  const now = params.createdAt ?? new Date();
  return Result.ok({
    id: params.id,
    userId: params.userId,
    type: params.type,
    title: params.title.trim(),
    body: params.body.trim(),
    href: params.href,
    readAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: params.createdById,
    updatedById: params.createdById,
  });
}

export type MarkNotificationReadError = { kind: "not_owner" } | { kind: "already_read" };

/**
 * Marks an unread notification read. Already-read rows are
 * rejected so mark-read stays idempotent at the call site: the
 * caller treats already_read as success-without-write.
 */
export function markNotificationRead(
  notification: Notification,
  params: { readById: string; readAt: Date },
): Result<Notification, MarkNotificationReadError> {
  if (params.readById !== notification.userId) {
    return Result.err({ kind: "not_owner" });
  }
  if (notification.readAt !== null) {
    return Result.err({ kind: "already_read" });
  }
  return Result.ok({
    ...notification,
    readAt: params.readAt,
    updatedAt: params.readAt,
  });
}
