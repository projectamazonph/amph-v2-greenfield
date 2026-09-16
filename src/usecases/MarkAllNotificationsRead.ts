/**
 * MarkAllNotificationsRead — owner clears the badge (P3-87).
 *
 * Marks every unread row read, one update per row. Already-read
 * rows are skipped, never rewritten. Returns the marked count so
 * the bell can optimistically zero the badge.
 */

import { Result } from "@/domain/shared/Result";
import { markNotificationRead } from "@/domain/entities/Notification";
import type { INotificationRepository } from "@/ports/repositories/INotificationRepository";
import type { Clock } from "@/ports/system/Clock";

export type MarkAllNotificationsReadError = { kind: "db_error"; message: string };

export interface MarkAllNotificationsReadDeps {
  notificationRepo: INotificationRepository;
  clock: Clock;
}

export class MarkAllNotificationsRead {
  constructor(private readonly deps: MarkAllNotificationsReadDeps) {}

  async execute(input: {
    actorId: string;
  }): Promise<Result<{ marked: number }, MarkAllNotificationsReadError>> {
    const listed = await this.deps.notificationRepo.listByUser(input.actorId);
    if (!listed.ok) {
      return Result.err({ kind: "db_error", message: listed.error.message });
    }
    let marked = 0;
    for (const notification of listed.value) {
      if (notification.readAt !== null) continue;
      const updated = markNotificationRead(notification, {
        readById: input.actorId,
        readAt: this.deps.clock.now(),
      });
      if (!updated.ok) continue;
      const saved = await this.deps.notificationRepo.update(updated.value);
      if (saved.ok) marked += 1;
    }
    return Result.ok({ marked });
  }
}
