/**
 * DismissAnnouncement use case - mark an announcement as dismissed for a user.
 * P1-07: Site-wide announcement banner.
 */

import { Result } from "@/domain/shared/Result";
import type { AnnouncementRepository, AnnouncementError } from "@/ports/repositories/LMS/AnnouncementRepository";

export interface DismissAnnouncementInput {
  announcementId: string;
  userId: string | null;
}

export class DismissAnnouncement {
  constructor(private readonly announcementRepo: AnnouncementRepository) {}

  async execute(input: DismissAnnouncementInput): Promise<Result<void, AnnouncementError>> {
    return this.announcementRepo.dismissForUser(input.announcementId, input.userId);
  }
}
