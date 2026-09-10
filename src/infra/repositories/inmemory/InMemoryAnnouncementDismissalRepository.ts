/**
 * InMemoryAnnouncementDismissalRepository — test fake.
 *
 * P1-07 (P4 PR-A). Stores user-dismissed announcement pairs in a Set.
 */

import { Result } from "@/domain/shared/Result";
import type { AnnouncementError } from "@/ports/repositories/IAnnouncementRepository";
import type { IAnnouncementDismissalRepository } from "@/ports/repositories/IAnnouncementDismissalRepository";

export class InMemoryAnnouncementDismissalRepository
  implements IAnnouncementDismissalRepository
{
  private readonly pairs = new Set<string>();

  private key(userId: string, announcementId: string): string {
    return `${userId}::${announcementId}`;
  }

  async isDismissed(
    userId: string,
    announcementId: string,
  ): Promise<Result<boolean, AnnouncementError>> {
    return Result.ok(this.pairs.has(this.key(userId, announcementId)));
  }

  async dismiss(
    userId: string,
    announcementId: string,
  ): Promise<Result<void, AnnouncementError>> {
    this.pairs.add(this.key(userId, announcementId));
    return Result.ok(undefined);
  }

  /** Test helper: clear every dismissal. */
  _reset(): void {
    this.pairs.clear();
  }
}
