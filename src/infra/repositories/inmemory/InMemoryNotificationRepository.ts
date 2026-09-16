/**
 * InMemoryNotificationRepository — test fake (P3-87).
 */

import type {
  INotificationRepository,
  NotificationQueryError,
  NotificationRepoError,
} from "@/ports/repositories/INotificationRepository";
import type { Notification } from "@/domain/entities/Notification";
import { Result } from "@/domain/shared/Result";

function unreadFirst(a: Notification, b: Notification): number {
  const aUnread = a.readAt === null ? 0 : 1;
  const bUnread = b.readAt === null ? 0 : 1;
  if (aUnread !== bUnread) return aUnread - bUnread;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export class InMemoryNotificationRepository implements INotificationRepository {
  private notifications: Notification[] = [];

  async create(notification: Notification): Promise<Result<Notification, NotificationQueryError>> {
    this.notifications.push(Object.freeze({ ...notification }));
    return Result.ok(notification);
  }

  async findById(id: string): Promise<Result<Notification | null, NotificationQueryError>> {
    const found = this.notifications.find((n) => n.id === id && n.deletedAt === null);
    return Result.ok(found ?? null);
  }

  async listByUser(
    userId: string,
  ): Promise<Result<readonly Notification[], NotificationQueryError>> {
    const filtered = this.notifications
      .filter((n) => n.userId === userId && n.deletedAt === null)
      .sort(unreadFirst);
    return Result.ok(filtered);
  }

  async unreadCount(userId: string): Promise<Result<number, NotificationQueryError>> {
    const count = this.notifications.filter(
      (n) => n.userId === userId && n.readAt === null && n.deletedAt === null,
    ).length;
    return Result.ok(count);
  }

  async update(notification: Notification): Promise<Result<Notification, NotificationRepoError>> {
    const index = this.notifications.findIndex((n) => n.id === notification.id);
    if (index === -1) {
      return Result.err({ kind: "not_found" });
    }
    this.notifications[index] = Object.freeze({ ...notification });
    return Result.ok(notification);
  }

  clear(): void {
    this.notifications = [];
  }
}
