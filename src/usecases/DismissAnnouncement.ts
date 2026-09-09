/**
 * DismissAnnouncement — user dismisses a single banner.
 *
 * P1-07 (P4 PR-A). Idempotent. No audit log on the read path — only
 * admin actions are audited per the project conventions
 * (AGENTS.md rule #5: "Every admin action logs to AuditLog").
 */

import { Result } from "@/domain/shared/Result";
import type { AnnouncementError } from "@/ports/repositories/IAnnouncementRepository";
import type { IAnnouncementDismissalRepository } from "@/ports/repositories/IAnnouncementDismissalRepository";

export class DismissAnnouncement {
  constructor(
    private readonly deps: {
      dismissalRepo: IAnnouncementDismissalRepository;
    },
  ) {}

  async execute(input: {
    userId: string;
    announcementId: string;
  }): Promise<Result<void, AnnouncementError>> {
    return this.deps.dismissalRepo.dismiss(input.userId, input.announcementId);
  }
}
