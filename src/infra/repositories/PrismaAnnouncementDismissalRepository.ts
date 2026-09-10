/**
 * PrismaAnnouncementDismissalRepository — production adapter for
 * IAnnouncementDismissalRepository.
 *
 * P1-07 (P4 PR-A). Dismissals are keyed by (userId, announcementId)
 * — `dismiss` is upsert to keep it idempotent (the port contract
 * says dismissing twice is not an error).
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { AnnouncementError } from "@/ports/repositories/IAnnouncementRepository";
import type { IAnnouncementDismissalRepository } from "@/ports/repositories/IAnnouncementDismissalRepository";

export class PrismaAnnouncementDismissalRepository
  implements IAnnouncementDismissalRepository
{
  constructor(private readonly db: PrismaClient) {}

  async isDismissed(
    userId: string,
    announcementId: string,
  ): Promise<Result<boolean, AnnouncementError>> {
    try {
      const row = await this.db.announcementDismissal.findUnique({
        where: { userId_announcementId: { userId, announcementId } },
        select: { id: true },
      });
      return Result.ok(row !== null);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async dismiss(
    userId: string,
    announcementId: string,
  ): Promise<Result<void, AnnouncementError>> {
    try {
      await this.db.announcementDismissal.upsert({
        where: { userId_announcementId: { userId, announcementId } },
        create: { userId, announcementId },
        update: {}, // no-op: the row already exists
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}
