/**
 * StreakService — streak logic and milestone detection.
 *
 * STORY-029: StreakService + streak visit recording.
 */

export interface StreakMilestone {
  streak: number;
  label: string;
  xpBonus: number;
  achieved: boolean;
}

// ── Milestone definitions ─────────────────────────────────────────────────────

const MILESTONES: readonly { streak: number; label: string; xpBonus: number }[] = [
  { streak: 7,   label: "7-Day Streak",  xpBonus: 25  },
  { streak: 30,  label: "30-Day Streak", xpBonus: 100 },
  { streak: 100, label: "Century",        xpBonus: 500 },
];

// ── StreakService ─────────────────────────────────────────────────────────────

export interface UserStreak {
  readonly id: string;
  readonly userId: string;
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class StreakService {
  /** XP awarded for reaching each milestone */
  static readonly MILESTONE_XP: ReadonlyMap<number, number> = new Map(
    MILESTONES.map((m) => [m.streak, m.xpBonus]),
  );

  /**
   * Strip the time component from a Date, returning midnight UTC.
   */
  static stripTime(date: Date): Date {
    return new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0,
    ));
  }

  /**
   * Returns true if `b` is exactly one calendar day after `a`.
   * Both dates are stripped of time before comparison.
   */
  static isConsecutiveDay(a: Date, b: Date): boolean {
    const aDay = this.stripTime(a).getTime();
    const bDay = this.stripTime(b).getTime();
    const oneDayMs = 86_400_000;
    return bDay - aDay === oneDayMs;
  }

  /**
   * Given the previous streak state and the current visit date, compute the new streak.
   * Returns the updated streak count, longest streak, and any milestone just hit.
   */
  static computeStreakUpdate(
    lastVisitDate: Date | null,
    currentStreak: number,
    longestStreak: number,
    visitDate: Date,
  ): {
    newStreak: number;
    newLongest: number;
    milestoneHit: StreakMilestone | null;
  } {
    const normalizedVisit = this.stripTime(visitDate);

    // First visit ever
    if (lastVisitDate === null) {
      return { newStreak: 1, newLongest: 1, milestoneHit: null };
    }

    const normalizedLast = this.stripTime(lastVisitDate);

    // Same calendar day — no change
    if (normalizedVisit.getTime() === normalizedLast.getTime()) {
      return { newStreak: currentStreak, newLongest: longestStreak, milestoneHit: null };
    }

    // Not consecutive — reset streak
    if (!this.isConsecutiveDay(normalizedLast, normalizedVisit)) {
      return { newStreak: 1, newLongest: longestStreak, milestoneHit: null };
    }

    // Consecutive — increment
    const newStreak = currentStreak + 1;
    const newLongest = Math.max(longestStreak, newStreak);

    // Check if a milestone was just hit
    const milestoneHit = this.checkMilestone(newStreak, currentStreak);

    return { newStreak, newLongest, milestoneHit };
  }

  /**
   * Returns all milestones with `achieved: true` if `currentStreak >= milestone.streak`.
   */
  static getMilestones(currentStreak: number): StreakMilestone[] {
    return MILESTONES.map((m) => ({
      ...m,
      achieved: currentStreak >= m.streak,
    }));
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private static checkMilestone(
    newStreak: number,
    previousStreak: number,
  ): StreakMilestone | null {
    // Only trigger on the exact day the milestone is reached (not already passed)
    for (const m of MILESTONES) {
      if (newStreak === m.streak && previousStreak < m.streak) {
        return { ...m, achieved: true };
      }
    }
    return null;
  }
}
