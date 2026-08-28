/**
 * UpdateAnnouncement use case - update an existing announcement.
 * P1-07: Site-wide announcement banner.
 */

import { Result } from "@/domain/shared/Result";
import type { AnnouncementRepository, AnnouncementError } from "@/ports/repositories/LMS/AnnouncementRepository";
import type { Announcement } from "@/domain/entities/LMS/Announcement";

export interface UpdateAnnouncementInput {
  id: string;
  title?: string;
  content?: string;
  severity?: "info" | "warning" | "critical";
  isActive?: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
}

export class UpdateAnnouncement {
  constructor(private readonly announcementRepo: AnnouncementRepository) {}

  async execute(input: UpdateAnnouncementInput): Promise<Result<Announcement, AnnouncementError>> {
    return this.announcementRepo.update(input.id, {
      title: input.title,
      content: input.content,
      severity: input.severity,
      isActive: input.isActive,
      startAt: input.startAt,
      endAt: input.endAt,
    });
  }
}
