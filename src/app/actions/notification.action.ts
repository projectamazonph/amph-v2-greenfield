/**
 * notification actions — P3-87 (STORY-139).
 *
 * Server action shims over NotifyUser / ListNotifications /
 * MarkNotificationRead / MarkAllNotificationsRead. Each action
 * resolves the caller via `getSessionUserId`; the use cases own
 * ownership checks. The bell polls listNotificationsAction.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { isNotificationType } from "@/domain/entities/Notification";

export type NotificationActionResult<T> =
  { ok: true; value: T } | { ok: false; error: { kind: string } };

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function listNotificationsAction(): Promise<
  NotificationActionResult<{ notifications: NotificationView[]; unreadCount: number }>
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  const container = buildContainer();
  const result = await container.listNotifications.execute({ actorId: userId });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  return {
    ok: true,
    value: {
      notifications: result.value.notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount: result.value.unreadCount,
    },
  };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult<{ id: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  const container = buildContainer();
  const result = await container.markNotificationRead.execute({
    actorId: userId,
    notificationId,
  });
  if (!result.ok) {
    // already_read is success-without-write for double-clicks.
    if (result.error.kind === "already_read") {
      return { ok: true, value: { id: notificationId } };
    }
    return { ok: false, error: { kind: result.error.kind } };
  }
  return { ok: true, value: { id: result.value.id } };
}

export async function markAllNotificationsReadAction(): Promise<
  NotificationActionResult<{ marked: number }>
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  const container = buildContainer();
  const result = await container.markAllNotificationsRead.execute({ actorId: userId });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  return { ok: true, value: { marked: result.value.marked } };
}

export async function notifyUserAction(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
}): Promise<NotificationActionResult<{ id: string }>> {
  const actorId = await getSessionUserId();
  if (!actorId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  if (!isNotificationType(input.type)) {
    return { ok: false, error: { kind: "invalid_type" } };
  }
  const container = buildContainer();
  const result = await container.notifyUser.execute({
    actorId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
  });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  return { ok: true, value: { id: result.value.id } };
}
