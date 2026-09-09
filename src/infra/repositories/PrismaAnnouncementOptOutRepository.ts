/**
 * PrismaAnnouncementOptOutRepository — production adapter for
 * IAnnouncementOptOutRepository.
 *
 * P1-07 (P4 PR-A). Opt-out is a single row per userId; setting
 * optedOut=false deletes the row so `hasOptOut` stays a cheap
 * COUNT-style check.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { AnnouncementError } from "@/ports/repositories/IAnnouncementRepository";
import type { IAnnouncementOptOutRepository } from "@/ports/repositories/IAnnouncementOptOutRepository";

export class PrismaAnnouncementOptOutRepository
  implements IAnnouncementOptOutRepository
{
  constructor(private readonly db: PrismaClient) {}

  async hasOptOut(userId: string): Promise<Result<boolean, AnnouncementError>> {
    try {
      const row = await this.db.announcementOptOut.findUnique({
        where: { userId },
        select: { id: true },
      });
      return Result.ok(row !== null);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async setOptOut(
    userId: string,
    optedOut: boolean,
  ): Promise<Result<void, AnnouncementError>> {
    try {
      if (optedOut) {
        await this.db.announcementOptOut.upsert({
          where: { userId },
          create: { userId },
          update: {}, // already opted out — nothing to change
        });
      } else {
        await this.db.announcementOptOut.deleteMany({ where: { userId } });
      }
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}
