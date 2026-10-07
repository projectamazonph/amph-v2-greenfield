/**
 * MarkNotificationRead — owner marks one item read (P3-87).
 *
 * already_read surfaces (not swallowed) so the bell treats a
 * double-click as success-without-write. Non-owners get not_owner.
 */

import { Result } from "@/domain/shared/Result";
import {
  markNotificationRead,
  type MarkNotificationReadError,
  type Notification,
} from "@/domain/entities/Notification";
import type { INotificationRepository } from "@/ports/repositories/INotificationRepository";
import type { Clock } from "@/ports/system/Clock";

export type MarkNotificationReadUseCaseError =
  MarkNotificationReadError | { kind: "not_found" } | { kind: "db_error"; message: string };

export interface MarkNotificationReadDeps {
  notificationRepo: INotificationRepository;
  clock: Clock;
}

export class MarkNotificationRead {
  constructor(private readonly deps: MarkNotificationReadDeps) {}

  async execute(input: {
    actorId: string;
    notificationId: string;
  }): Promise<Result<Notification, MarkNotificationReadUseCaseError>> {
    const existing = await this.deps.notificationRepo.findById(input.notificationId);
    if (!existing.ok) {
      return Result.err({ kind: "db_error", message: existing.error.message });
    }
    if (!existing.value) {
      return Result.err({ kind: "not_found" });
    }
    const marked = markNotificationRead(existing.value, {
      readById: input.actorId,
      readAt: this.deps.clock.now(),
    });
    if (!marked.ok) return marked;
    const saved = await this.deps.notificationRepo.update(marked.value);
    if (!saved.ok) {
      if (saved.error.kind === "not_found") return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: saved.error.message });
    }
    return Result.ok(saved.value);
  }
}
