/**
 * InMemorySentReminderRepository — test fake.
 */

import type {
  SentReminderError,
  SentReminderRepository,
} from "@/ports/repositories/SentReminderRepository";
import { Result } from "@/domain/shared/Result";

export class InMemorySentReminderRepository implements SentReminderRepository {
  // key is "liveClassId:userId" — fast O(1) lookup
  private sent = new Set<string>();

  private key(liveClassId: string, userId: string): string {
    return `${liveClassId}:${userId}`;
  }

  async wasSent(args: { liveClassId: string; userId: string }): Promise<boolean> {
    return this.sent.has(this.key(args.liveClassId, args.userId));
  }

  async markSent(args: {
    liveClassId: string;
    userId: string;
  }): Promise<Result<void, SentReminderError>> {
    const k = this.key(args.liveClassId, args.userId);
    if (this.sent.has(k)) {
      return Result.err({ kind: "already_sent" });
    }
    this.sent.add(k);
    return Result.ok(undefined);
  }
}
