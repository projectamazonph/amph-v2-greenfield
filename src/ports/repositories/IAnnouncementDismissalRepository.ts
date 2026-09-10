/**
 * IAnnouncementDismissalRepository — port for per-user announcement
 * dismissals.
 *
 * P1-07 (P4 PR-A). Anonymous visitors dismiss per session in the
 * browser; logged-in users get a durable row here so the banner
 * stays dismissed across devices.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type { AnnouncementError } from "@/ports/repositories/IAnnouncementRepository";

export interface IAnnouncementDismissalRepository {
  isDismissed(
    userId: string,
    announcementId: string,
  ): Promise<Result<boolean, AnnouncementError>>;

  /** Idempotent: dismissing twice is not an error. */
  dismiss(userId: string, announcementId: string): Promise<Result<void, AnnouncementError>>;
}
