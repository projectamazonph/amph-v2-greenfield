/**
 * InMemoryAnnouncementOptOutRepository — test fake.
 *
 * P1-07 (P4 PR-A). Stores opted-out userIds in a Set.
 */

import { Result } from "@/domain/shared/Result";
import type { AnnouncementError } from "@/ports/repositories/IAnnouncementRepository";
import type { IAnnouncementOptOutRepository } from "@/ports/repositories/IAnnouncementOptOutRepository";

export class InMemoryAnnouncementOptOutRepository
  implements IAnnouncementOptOutRepository
{
  private readonly optedOut = new Set<string>();

  async hasOptOut(userId: string): Promise<Result<boolean, AnnouncementError>> {
    return Result.ok(this.optedOut.has(userId));
  }

  async setOptOut(
    userId: string,
    optedOut: boolean,
  ): Promise<Result<void, AnnouncementError>> {
    if (optedOut) this.optedOut.add(userId);
    else this.optedOut.delete(userId);
    return Result.ok(undefined);
  }

  /** Test helper. */
  _reset(): void {
    this.optedOut.clear();
  }
}
