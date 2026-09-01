/**
 * CreateAnnouncement use case - create a new site-wide announcement.
 * P1-07: Site-wide announcement banner.
 */

import { Result } from "@/domain/shared/Result";
import type { AnnouncementRepository, AnnouncementError } from "@/ports/repositories/LMS/AnnouncementRepository";
import type { Announcement } from "@/domain/entities/LMS/Announcement";

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  severity?: "info" | "warning" | "critical";
  isActive?: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
  createdById?: string | null;
}

export class CreateAnnouncement {
  constructor(private readonly announcementRepo: AnnouncementRepository) {}

  async execute(input: CreateAnnouncementInput): Promise<Result<Announcement, AnnouncementError>> {
    return this.announcementRepo.create({
      title: input.title,
      content: input.content,
      severity: input.severity,
      isActive: input.isActive ?? true,
      startAt: input.startAt,
      endAt: input.endAt,
      createdById: input.createdById,
    });
  }
}
