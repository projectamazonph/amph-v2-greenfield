/**
 * AnnouncementRepository port for P1-07 site-wide announcement banner.
 */

import type { Announcement } from "@/domain/entities/LMS/Announcement";
import { Result } from "@/domain/shared/Result";

export type AnnouncementError =
  { kind: "not_found" } | { kind: "db_error"; message: string };

export interface AnnouncementRepository {
  /**
   * Get all active announcements.
   */
  getActive(): Promise<Result<readonly Announcement[], AnnouncementError>>;

  /**
   * Get announcement by ID.
   */
  findById(id: string): Promise<Result<Announcement, AnnouncementError>>;

  /**
   * List all announcements.
   */
  listAll(): Promise<Result<readonly Announcement[], AnnouncementError>>;

  /**
   * Create a new announcement.
   */
  create(params: {
    title: string;
    content: string;
    severity?: "info" | "warning" | "critical";
    isActive?: boolean;
    startAt?: Date | null;
    endAt?: Date | null;
    createdById?: string | null;
  }): Promise<Result<Announcement, AnnouncementError>>;

  /**
   * Update an announcement.
   */
  update(
    id: string,
    patch: Partial<{
      title: string;
      content: string;
      severity: "info" | "warning" | "critical";
      isActive: boolean;
      startAt: Date | null;
      endAt: Date | null;
    }>,
  ): Promise<Result<Announcement, AnnouncementError>>;

  /**
   * Delete an announcement.
   */
  delete(id: string): Promise<Result<void, AnnouncementError>>;

  /**
   * Dismiss an announcement for a user session.
   * Uses cookies or localStorage to track dismissed announcements.
   */
  dismissForUser(announcementId: string, userId: string | null): Promise<Result<void, AnnouncementError>>;

  /**
   * Check if a user has dismissed an announcement.
   */
  isDismissedByUser(announcementId: string, userId: string | null): Promise<Result<boolean, AnnouncementError>>;
}
