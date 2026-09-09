/**
 * SetAnnouncementOptOut — user opts in or out of all banners.
 *
 * P1-07 (P4 PR-A). Idempotent. No audit log entry — this is a
 * user preference, not an admin action.
 */

import { Result } from "@/domain/shared/Result";
import type { AnnouncementError } from "@/ports/repositories/IAnnouncementRepository";
import type { IAnnouncementOptOutRepository } from "@/ports/repositories/IAnnouncementOptOutRepository";

export class SetAnnouncementOptOut {
  constructor(
    private readonly deps: {
      optOutRepo: IAnnouncementOptOutRepository;
    },
  ) {}

  async execute(input: {
    userId: string;
    optedOut: boolean;
  }): Promise<Result<{ optedOut: boolean }, AnnouncementError>> {
    const result = await this.deps.optOutRepo.setOptOut(
      input.userId,
      input.optedOut,
    );
    if (!result.ok) return Result.err(result.error);
    return Result.ok({ optedOut: input.optedOut });
  }
}
