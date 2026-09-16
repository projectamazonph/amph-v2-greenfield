/**
 * PrismaNotificationRepository — production adapter (P3-87).
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { isNotificationType, type Notification } from "@/domain/entities/Notification";
import type {
  INotificationRepository,
  NotificationQueryError,
  NotificationRepoError,
} from "@/ports/repositories/INotificationRepository";

interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: isNotificationType(row.type) ? row.type : "announcement",
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    createdById: row.createdById ?? "",
    updatedById: row.updatedById ?? "",
  };
}

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(notification: Notification): Promise<Result<Notification, NotificationQueryError>> {
    try {
      const row = await this.db.notification.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          href: notification.href,
          createdById: notification.createdById,
          updatedById: notification.updatedById,
        },
      });
      return Result.ok(mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Notification | null, NotificationQueryError>> {
    try {
      const row = await this.db.notification.findFirst({
        where: { id, deletedAt: null },
      });
      if (!row) return Result.ok(null);
      return Result.ok(mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByUser(
    userId: string,
  ): Promise<Result<readonly Notification[], NotificationQueryError>> {
    try {
      const rows = await this.db.notification.findMany({
        where: { userId, deletedAt: null },
        orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      });
      return Result.ok(rows.map(mapRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async unreadCount(userId: string): Promise<Result<number, NotificationQueryError>> {
    try {
      const count = await this.db.notification.count({
        where: { userId, readAt: null, deletedAt: null },
      });
      return Result.ok(count);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(notification: Notification): Promise<Result<Notification, NotificationRepoError>> {
    try {
      const existing = await this.db.notification.findFirst({
        where: { id: notification.id },
      });
      if (!existing) {
        return Result.err({ kind: "not_found" });
      }
      const row = await this.db.notification.update({
        where: { id: notification.id },
        data: {
          readAt: notification.readAt,
          updatedAt: notification.updatedAt,
          updatedById: notification.updatedById,
          deletedAt: notification.deletedAt,
        },
      });
      return Result.ok(mapRow(row));
    } catch (err: unknown) {
      const message = String(err);
      if (message.includes("Record to update not found")) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message });
    }
  }
}
