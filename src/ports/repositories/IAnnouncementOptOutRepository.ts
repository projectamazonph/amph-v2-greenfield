/**
 * IAnnouncementOptOutRepository — port for the per-user
 * "hide all site announcements" preference.
 *
 * P1-07 (P4 PR-A). Presence of a row means opted out; `setOptOut(false)`
 * removes it. Opting out suppresses every banner, including ones the
 * user has never seen.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type { AnnouncementError } from "@/ports/repositories/IAnnouncementRepository";

export interface IAnnouncementOptOutRepository {
  hasOptOut(userId: string): Promise<Result<boolean, AnnouncementError>>;

  setOptOut(userId: string, optedOut: boolean): Promise<Result<void, AnnouncementError>>;
}
