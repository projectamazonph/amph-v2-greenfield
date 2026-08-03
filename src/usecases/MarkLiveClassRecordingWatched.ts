/**
 * `MarkLiveClassRecordingWatched` — STORY-100.
 *
 * A student marks a completed live class's posted recording as watched.
 * Awards `XPService.LIVE_CLASS_ATTENDED_XP` once per (user, live class),
 * fire-and-forget, mirroring `AwardBadge`'s XP-award pattern.
 *
 * Rules:
 *  1. Live class must exist → not_found
 *  2. Live class must be completed and have a recording → recording_not_available
 *  3. Caller must have an RSVP row for this class → not_registered
 *  4. Idempotent: if already watched, returns the existing registration
 *     without re-awarding XP.
 */

import { Result } from "@/domain/shared/Result";
import { markRecordingWatched } from "@/domain/entities/LiveClassRegistration";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { ILiveClassRegistrationRepository } from "@/ports/repositories/ILiveClassRegistrationRepository";
import type { Clock } from "@/ports/system/Clock";
import { AwardXP } from "@/usecases/AwardXP";
import { XPService } from "@/domain/services/XPService";

export type MarkLiveClassRecordingWatchedError =
  | { kind: "not_found" }
  | { kind: "recording_not_available" }
  | { kind: "not_registered" }
  | { kind: "db_error"; message: string };

export interface MarkLiveClassRecordingWatchedInput {
  userId: string;
  liveClassId: string;
}

export interface MarkLiveClassRecordingWatchedDeps {
  liveClassRepo: ILiveClassRepository;
  liveClassRegistrationRepo: ILiveClassRegistrationRepository;
  awardXp: AwardXP;
  clock: Clock;
}

export class MarkLiveClassRecordingWatched {
  constructor(private readonly deps: MarkLiveClassRecordingWatchedDeps) {}

  async execute(
    input: MarkLiveClassRecordingWatchedInput,
  ): Promise<Result<LiveClassRegistration, MarkLiveClassRecordingWatchedError>> {
    const classResult = await this.deps.liveClassRepo.findById(input.liveClassId);
    if (!classResult.ok) {
      return Result.err({ kind: "db_error", message: "class lookup failed" });
    }
    const liveClass = classResult.value;
    if (!liveClass) {
      return Result.err({ kind: "not_found" });
    }
    if (liveClass.status !== "completed" || !liveClass.recordingUrl) {
      return Result.err({ kind: "recording_not_available" });
    }

    const regResult = await this.deps.liveClassRegistrationRepo.findByUserAndClass(
      input.userId,
      input.liveClassId,
    );
    if (!regResult.ok) {
      return Result.err({ kind: "db_error", message: "registration lookup failed" });
    }
    const registration = regResult.value;
    if (!registration || registration.status === "cancelled") {
      return Result.err({ kind: "not_registered" });
    }

    if (registration.watchedRecordingAt) {
      // Already watched — idempotent no-op, no duplicate XP.
      return Result.ok(registration);
    }

    const now = this.deps.clock.now();
    const updated = markRecordingWatched(registration, now);
    const persistResult = await this.deps.liveClassRegistrationRepo.update(updated);
    if (!persistResult.ok) {
      return Result.err({ kind: "db_error", message: "update failed" });
    }

    this.deps.awardXp
      .execute({
        userId: input.userId,
        amount: XPService.LIVE_CLASS_ATTENDED_XP,
        reason: "live_class_attended",
        refId: liveClass.id,
      })
      .catch((err: unknown) => {
        console.error("[MarkLiveClassRecordingWatched] Failed to award XP:", err);
      });

    return Result.ok(updated);
  }
}
