/**
 * InMemoryUserStreakRepository — test adapter.
 *
 * STORY-029: StreakService + streak visit recording.
 */

import { Result } from "@/domain/shared/Result";
import type { IUserStreakRepository, UserStreakError } from "@/ports/repositories/IUserStreakRepository";
import type { UserStreak } from "@/domain/services/StreakService";

export class InMemoryUserStreakRepository implements IUserStreakRepository {
  private streaks = new Map<string, UserStreak>();

  async findByUserId(userId: string): Promise<Result<UserStreak | null, UserStreakError>> {
    const streak = this.streaks.get(userId) ?? null;
    return Result.ok(streak);
  }

  async upsert(streak: UserStreak): Promise<Result<UserStreak, UserStreakError>> {
    this.streaks.set(streak.userId, streak);
    return Result.ok(streak);
  }

  /** Remove all streaks. Call between tests. */
  clear(): void {
    this.streaks.clear();
  }
}
