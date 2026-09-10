/**
 * GetActiveAnnouncementsForUser — the public-facing banner query.
 *
 * P1-07 (P4 PR-A). Filters:
 *   1. Announcement.isVisibleAt(now) (active + inside window)
 *   2. AnnouncementDismissal.isDismissed(userId, announcementId) === false
 *   3. AnnouncementOptOut.hasOptOut(userId) === false (when userId given)
 *
 * Anonymous visitors (userId === null) skip steps 2 and 3; the
 * banner's client component handles per-session dismissal in
 * sessionStorage so the server only sees step 1.
 */

import { Result } from "@/domain/shared/Result";
import type {
  IAnnouncementRepository,
  AnnouncementError,
} from "@/ports/repositories/IAnnouncementRepository";
import type { IAnnouncementDismissalRepository } from "@/ports/repositories/IAnnouncementDismissalRepository";
import type { IAnnouncementOptOutRepository } from "@/ports/repositories/IAnnouncementOptOutRepository";
import type { Clock } from "@/ports/system/Clock";
import type { Announcement } from "@/domain/entities/Announcement";

export class GetActiveAnnouncementsForUser {
  constructor(
    private readonly deps: {
      announcementRepo: IAnnouncementRepository;
      dismissalRepo: IAnnouncementDismissalRepository;
      optOutRepo: IAnnouncementOptOutRepository;
      clock: Clock;
    },
  ) {}

  async execute(input: {
    userId: string | null;
  }): Promise<Result<readonly Announcement[], AnnouncementError>> {
    const now = this.deps.clock.now();

    if (input.userId !== null) {
      const optedOut = await this.deps.optOutRepo.hasOptOut(input.userId);
      if (!optedOut.ok) return Result.err(optedOut.error);
      if (optedOut.value) return Result.ok([]);
    }

    const active = await this.deps.announcementRepo.listActive(now);
    if (!active.ok) return Result.err(active.error);

    if (input.userId === null) {
      return Result.ok(active.value);
    }

    const visible: Announcement[] = [];
    for (const a of active.value) {
      const dismissed = await this.deps.dismissalRepo.isDismissed(
        input.userId,
        a.id,
      );
      if (!dismissed.ok) return Result.err(dismissed.error);
      if (!dismissed.value) visible.push(a);
    }
    return Result.ok(visible);
  }
}
