/**
 * PrismaSentReminderRepository — production adapter.
 *
 * P0-7 follow-up: persists (liveClassId, userId) pairs for the
 * SendLiveClassReminders idempotency check. The unique constraint
 * on the pair is the source of truth — a duplicate insert fails
 * with P2002 and we surface that as `already_sent`.
 */

import type { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  SentReminderError,
  SentReminderRepository,
} from "@/ports/repositories/SentReminderRepository";

export class PrismaSentReminderRepository
  implements SentReminderRepository
{
  constructor(private readonly db: PrismaClient) {}

  async wasSent(args: { liveClassId: string; userId: string }): Promise<boolean> {
    try {
      const row = await this.db.sentReminder.findUnique({
        where: {
          liveClassId_userId: {
            liveClassId: args.liveClassId,
            userId: args.userId,
          },
        },
        select: { id: true },
      });
      return row !== null;
    } catch {
      // On a DB error, fail open (assume not sent). The next
      // markSent will either succeed or hit the unique constraint
      // and tell us.
      return false;
    }
  }

  async markSent(args: {
    liveClassId: string;
    userId: string;
  }): Promise<Result<void, SentReminderError>> {
    try {
      await this.db.sentReminder.create({
        data: {
          liveClassId: args.liveClassId,
          userId: args.userId,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      // P2002 = unique constraint violation. Treat as success —
      // a prior cron run already marked this pair.
      const msg = String(err);
      if (msg.includes("P2002") || msg.includes("Unique constraint")) {
        return Result.err({ kind: "already_sent" });
      }
      return Result.err({
        kind: "db_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
