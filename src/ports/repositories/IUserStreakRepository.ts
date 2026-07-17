/**
 * IUserStreakRepository — port for persisting user streak data.
 *
 * STORY-029: StreakService + streak visit recording.
 */

import { Result } from "@/domain/shared/Result";
import type { UserStreak } from "@/domain/services/StreakService";

export type UserStreakError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface IUserStreakRepository {
  /**
   * Find a user's streak record.
   * Returns not_found if no record exists.
   */
  findByUserId(userId: string): Promise<Result<UserStreak | null, UserStreakError>>;

  /**
   * Create or update a user's streak record.
   */
  upsert(streak: UserStreak): Promise<Result<UserStreak, UserStreakError>>;
}
