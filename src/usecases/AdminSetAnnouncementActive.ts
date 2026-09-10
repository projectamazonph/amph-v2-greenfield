/**
 * AdminSetAnnouncementActive — toggle an announcement on or off.
 *
 * P1-07 (P4 PR-A). Distinct from AdminUpdateAnnouncement so the
 * audit log carries a clean `announcement.toggled` action.
 */

import { Result } from "@/domain/shared/Result";
import type {
  IAnnouncementRepository,
  AnnouncementError,
} from "@/ports/repositories/IAnnouncementRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export type AdminSetAnnouncementActiveError =
  | { kind: "not_found" }
  | AnnouncementError;

export class AdminSetAnnouncementActive {
  constructor(
    private readonly deps: {
      announcementRepo: IAnnouncementRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: {
    id: string;
    active: boolean;
    actorId: string;
  }): Promise<Result<{ isActive: boolean }, AdminSetAnnouncementActiveError>> {
    const updated = await this.deps.announcementRepo.setActive(
      input.id,
      input.active,
      { id: input.actorId },
    );
    if (!updated.ok) {
      if (updated.error.kind === "not_found") {
        return Result.err({ kind: "not_found" });
      }
      return Result.err(updated.error);
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "announcement.toggled",
      targetId: updated.value.id,
      targetType: "announcement",
      metadata: { isActive: updated.value.isActive },
    });

    return Result.ok({ isActive: updated.value.isActive });
  }
}
