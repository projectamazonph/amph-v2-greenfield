/**
 * AdminUpdateAnnouncement — admin edits an existing announcement.
 *
 * P1-07 (P4 PR-A). Partial updates: only fields present in the
 * payload are touched. Validation runs on the merged result so an
 * admin cannot save `endsAt <= startsAt`.
 */

import { Result } from "@/domain/shared/Result";
import type {
  IAnnouncementRepository,
  AnnouncementError,
} from "@/ports/repositories/IAnnouncementRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export type AdminUpdateAnnouncementError =
  | { kind: "not_found" }
  | { kind: "invalid_window"; message: string }
  | AnnouncementError;

export interface AdminUpdateAnnouncementInput {
  id: string;
  title?: string;
  body?: string;
  level?: "INFO" | "WARNING" | "CRITICAL";
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  dismissible?: boolean;
  actorId: string;
}

export class AdminUpdateAnnouncement {
  constructor(
    private readonly deps: {
      announcementRepo: IAnnouncementRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(
    input: AdminUpdateAnnouncementInput,
  ): Promise<
    Result<{ announcementId: string }, AdminUpdateAnnouncementError>
  > {
    const current = await this.deps.announcementRepo.findById(input.id);
    if (!current.ok) return Result.err(current.error);
    if (!current.value) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "announcement.update_failed",
        targetId: input.id,
        targetType: "announcement",
        metadata: { error: "not_found" },
      });
      return Result.err({ kind: "not_found" });
    }

    const mergedStartsAt =
      input.startsAt !== undefined ? input.startsAt : current.value.startsAt;
    const mergedEndsAt =
      input.endsAt !== undefined ? input.endsAt : current.value.endsAt;
    if (
      mergedStartsAt !== null &&
      mergedEndsAt !== null &&
      mergedEndsAt <= mergedStartsAt
    ) {
      return Result.err({
        kind: "invalid_window",
        message: "End time must be after the start time.",
      });
    }

    const updated = await this.deps.announcementRepo.update(
      input.id,
      {
        title: input.title,
        body: input.body,
        level: input.level,
        isActive: input.isActive,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        dismissible: input.dismissible,
      },
      { id: input.actorId },
    );
    if (!updated.ok) return Result.err(updated.error);

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "announcement.updated",
      targetId: updated.value.id,
      targetType: "announcement",
      metadata: {
        fields: Object.keys(input).filter((k) => k !== "id" && k !== "actorId"),
      },
    });

    return Result.ok({ announcementId: updated.value.id });
  }
}
