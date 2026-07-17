/**
 * RecordStreakVisit — records a daily visit and updates the user's streak.
 *
 * STORY-029: StreakService + streak visit recording.
 *
 * Rules:
 *  1. Find or create UserStreak record
 *  2. Compute new streak via StreakService.computeStreakUpdate
 *  3. Persist updated streak
 *  4. If milestone hit → award streak bonus XP (fire-and-forget)
 */

import { Result } from "@/domain/shared/Result";
import { StreakService } from "@/domain/services/StreakService";
import type { IUserStreakRepository } from "@/ports/repositories/IUserStreakRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { UserStreak } from "@/domain/services/StreakService";

// ── Input / Output types ──────────────────────────────────────────────────────

export interface RecordStreakVisitInput {
  userId: string;
  visitDate: Date;
}

export type RecordStreakVisitError = { kind: "db_error"; message: string };

export type RecordStreakVisitResult = Result<
  {
    currentStreak: number;
    longestStreak: number;
    milestoneHit: { streak: number; label: string; xpBonus: number } | null;
  },
  RecordStreakVisitError
>;

// ── Dependencies ─────────────────────────────────────────────────────────────

export interface RecordStreakVisitDeps {
  streakRepo: IUserStreakRepository;
  awardXpExecute: (params: {
    userId: string;
    amount: number;
    reason: "streak_bonus";
    refId?: string;
  }) => Promise<unknown>;
  idGen: IdGenerator;
  clock: Clock;
}

// ── Use Case ─────────────────────────────────────────────────────────────────

export class RecordStreakVisit {
  constructor(private readonly deps: RecordStreakVisitDeps) {}

  async execute(input: RecordStreakVisitInput): Promise<RecordStreakVisitResult> {
    // ── 1. Find existing streak ──────────────────────────────
    const existingResult = await this.deps.streakRepo.findByUserId(input.userId);
    if (!existingResult.ok) {
      return Result.err({ kind: "db_error", message: "Failed to fetch streak" });
    }

    const existing = existingResult.value;

    // ── 2. Compute new streak ─────────────────────────────────
    const { newStreak, newLongest, milestoneHit } = StreakService.computeStreakUpdate(
      existing?.lastVisitDate ?? null,
      existing?.currentStreak ?? 0,
      existing?.longestStreak ?? 0,
      input.visitDate,
    );

    // No change needed (same-day revisit)
    if (existing && newStreak === existing.currentStreak && newLongest === existing.longestStreak) {
      return Result.ok({
        currentStreak: newStreak,
        longestStreak: newLongest,
        milestoneHit: null,
      });
    }

    // ── 3. Build updated streak record ───────────────────────
    const updatedStreak: UserStreak = {
      id: existing?.id ?? this.deps.idGen.newId(),
      userId: input.userId,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastVisitDate: StreakService.stripTime(input.visitDate),
      createdAt: existing?.createdAt ?? this.deps.clock.now(),
      updatedAt: this.deps.clock.now(),
    };

    // ── 4. Persist ────────────────────────────────────────────
    const upsertResult = await this.deps.streakRepo.upsert(updatedStreak);
    if (!upsertResult.ok) {
      return Result.err({ kind: "db_error", message: "Failed to save streak" });
    }

    // ── 5. Award milestone XP (fire-and-forget) ───────────────
    if (milestoneHit) {
      this.deps
        .awardXpExecute({
          userId: input.userId,
          amount: milestoneHit.xpBonus,
          reason: "streak_bonus",
        })
        .catch((err: unknown) => {
          console.error("[RecordStreakVisit] Failed to award streak XP:", err);
        });
    }

    return Result.ok({
      currentStreak: newStreak,
      longestStreak: newLongest,
      milestoneHit: milestoneHit
        ? {
            streak: milestoneHit.streak,
            label: milestoneHit.label,
            xpBonus: milestoneHit.xpBonus,
          }
        : null,
    });
  }
}
