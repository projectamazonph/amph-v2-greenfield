/**
 * NotifyUser — create one notification (P3-87).
 *
 * Called from server actions (course completion today; refunds and
 * enrollments in follow-ups). The caller proves intent; this use
 * case validates the row in the domain and persists it.
 */

import { Result } from "@/domain/shared/Result";
import {
  createNotification,
  type CreateNotificationError,
  type Notification,
  type NotificationType,
} from "@/domain/entities/Notification";
import type { INotificationRepository } from "@/ports/repositories/INotificationRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface NotifyUserInput {
  actorId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
}

export type NotifyUserError = CreateNotificationError | { kind: "db_error"; message: string };

export interface NotifyUserDeps {
  notificationRepo: INotificationRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export class NotifyUser {
  constructor(private readonly deps: NotifyUserDeps) {}

  async execute(input: NotifyUserInput): Promise<Result<Notification, NotifyUserError>> {
    const built = createNotification({
      id: this.deps.idGen.newId(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      createdById: input.actorId,
      createdAt: this.deps.clock.now(),
    });
    if (!built.ok) return built;
    const saved = await this.deps.notificationRepo.create(built.value);
    if (!saved.ok) {
      return Result.err({ kind: "db_error", message: saved.error.message });
    }
    return Result.ok(saved.value);
  }
}
