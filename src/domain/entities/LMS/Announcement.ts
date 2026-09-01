/**
 * Announcement entity for P1-07 site-wide announcement banner.
 */

export type AnnouncementSeverity = "info" | "warning" | "critical";

export interface Announcement {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly severity: AnnouncementSeverity;
  readonly isActive: boolean;
  readonly startAt: Date | null;
  readonly endAt: Date | null;
  readonly createdById: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateAnnouncementParams {
  title: string;
  content: string;
  severity?: AnnouncementSeverity;
  isActive?: boolean;
  startAt?: Date | null;
  endAt?: Date | null;
  createdById?: string | null;
}
