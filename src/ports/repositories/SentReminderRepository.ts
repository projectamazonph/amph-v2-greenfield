/**
 * SentReminderRepository port — P0-7 follow-up.
 *
 * Tracks which live-class reminder emails have been sent, keyed
 * on (liveClassId, userId). The cron checks this table before
 * sending a reminder and inserts a row after a successful send.
 *
 * The unique constraint on (liveClassId, userId) means the
 * database itself enforces "you can't send the same reminder
 * twice" — even if the cron runs concurrently, the second
 * insert will fail with a unique violation and we can treat
 * that as "already sent, skip".
 *
 * ADR-014: every method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";

export type SentReminderError = { kind: "already_sent" } | { kind: "db_error"; message: string };

export interface SentReminderRepository {
  /**
   * Check whether a reminder has already been sent for this
   * (liveClassId, userId) pair.
   */
  wasSent(args: { liveClassId: string; userId: string }): Promise<boolean>;

  /**
   * Record that a reminder was sent. If a row already exists for
   * this pair, returns `already_sent` (the unique constraint
   * fired). This is treated as success at the use-case level —
   * we just skip the email.
   */
  markSent(args: { liveClassId: string; userId: string }): Promise<Result<void, SentReminderError>>;
}
