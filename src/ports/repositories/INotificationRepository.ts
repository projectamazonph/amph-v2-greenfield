/**
 * INotificationRepository — port for in-app notifications (P3-87).
 *
 * Entities in, entities out. Reads are owner-scoped by userId.
 * Implementations: PrismaNotificationRepository (prod),
 * InMemoryNotificationRepository (tests).
 */

import type { Result } from "@/domain/shared/Result";
import type { Notification } from "@/domain/entities/Notification";

export type NotificationRepoError = { kind: "not_found" } | { kind: "db_error"; message: string };

export type NotificationQueryError = { kind: "db_error"; message: string };

export interface INotificationRepository {
  /**
   * Persist a new notification. Postconditions: the row is
   * retrievable via findById with identical fields.
   */
  create(notification: Notification): Promise<Result<Notification, NotificationQueryError>>;

  /** Single notification by id, or null. Soft-deleted rows excluded. */
  findById(id: string): Promise<Result<Notification | null, NotificationQueryError>>;

  /**
   * One user's notifications, unread first then newest.
   * Soft-deleted rows excluded.
   */
  listByUser(userId: string): Promise<Result<readonly Notification[], NotificationQueryError>>;

  /** Count of unread rows for the badge. */
  unreadCount(userId: string): Promise<Result<number, NotificationQueryError>>;

  /**
   * Persist a mark-read transition. Errors: `not_found` — no
   * notification with this id exists.
   */
  update(notification: Notification): Promise<Result<Notification, NotificationRepoError>>;
}
