/**
 * ListNotifications — owner-scoped bell reads (P3-87).
 *
 * Returns the caller's notifications (unread first, then newest)
 * plus the unread count for the badge. One round trip: list and
 * count run in parallel.
 */

import { Result } from "@/domain/shared/Result";
import type { Notification } from "@/domain/entities/Notification";
import type { INotificationRepository } from "@/ports/repositories/INotificationRepository";

export type ListNotificationsError = { kind: "db_error"; message: string };

export interface ListNotificationsDeps {
  notificationRepo: INotificationRepository;
}

export class ListNotifications {
  constructor(private readonly deps: ListNotificationsDeps) {}

  async execute(input: {
    actorId: string;
  }): Promise<
    Result<{ notifications: readonly Notification[]; unreadCount: number }, ListNotificationsError>
  > {
    const [listed, counted] = await Promise.all([
      this.deps.notificationRepo.listByUser(input.actorId),
      this.deps.notificationRepo.unreadCount(input.actorId),
    ]);
    if (!listed.ok) return Result.err({ kind: "db_error", message: listed.error.message });
    if (!counted.ok) return Result.err({ kind: "db_error", message: counted.error.message });
    return Result.ok({ notifications: listed.value, unreadCount: counted.value });
  }
}
