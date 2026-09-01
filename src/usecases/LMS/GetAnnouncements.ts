/**
 * GetAnnouncements use case - retrieve active announcements.
 * P1-07: Site-wide announcement banner.
 */

import { Result } from "@/domain/shared/Result";
import type { AnnouncementRepository, AnnouncementError } from "@/ports/repositories/LMS/AnnouncementRepository";
import type { Announcement } from "@/domain/entities/LMS/Announcement";

export class GetAnnouncements {
  constructor(private readonly announcementRepo: AnnouncementRepository) {}

  async execute(): Promise<Result<readonly Announcement[], AnnouncementError>> {
    return this.announcementRepo.getActive();
  }
}
