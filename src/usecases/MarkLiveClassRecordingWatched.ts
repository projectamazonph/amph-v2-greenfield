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
 *
 * Race safety: the "already watched?" guard used to be a plain read
 * (`findByUserAndClass`) followed by an unconditional `update()` — two
 * concurrent calls could both read `watchedRecordingAt === null` before
 * either write landed, and both would award XP (a real bug found in
 * review). `liveClassRegistrationRepo.markRecordingWatched()` is a
 * conditional, atomic write (`UPDATE ... WHERE watched_recording_at IS
 * NULL`); only the caller whose write actually flips the row gets `true`
 * back and is allowed to award XP. Everyone else — including the fast
 * in-process check below, which stays only as a read-avoidance
 * optimization for the common already-watched case — is a no-op.
 */

import { Result } from "@/domain/shared/Result";
import { markRecordingWatched } from "@/domain/entities/LiveClassRegistration";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { ILiveClassRegistrationRepository } from "@/ports/repositories/ILiveClassRegistrationRepository";
import type { Clock } from "@/ports/system/Clock";
import { AwardXP } from "@/usecases/AwardXP";
import { XPService } from "@/domain/services/XPService";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";

export type MarkLiveClassRecordingWatchedError =
  | { kind: "not_found" }
  | { kind: "recording_not_available" }
  | { kind: "not_registered" }
  | { kind: "course_access_required" }
  | { kind: "db_error"; message: string };

export interface MarkLiveClassRecordingWatchedInput {
  userId: string;
  liveClassId: string;
}

export interface MarkLiveClassRecordingWatchedDeps {
  liveClassRepo: ILiveClassRepository;
  liveClassRegistrationRepo: ILiveClassRegistrationRepository;
  enrollmentRepo: IEnrollmentRepository;
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

    const enrollment = await this.deps.enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      liveClass.courseId,
    );
    if (!enrollment || enrollment.status !== "active") {
      return Result.err({ kind: "course_access_required" });
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
      // Already watched — idempotent no-op, no duplicate XP. Read-avoidance
      // fast path only; the atomic call below is the real guard.
      return Result.ok(registration);
    }

    const now = this.deps.clock.now();
    const markResult = await this.deps.liveClassRegistrationRepo.markRecordingWatched(
      input.userId,
      input.liveClassId,
      now,
    );
    if (!markResult.ok) {
      if (markResult.error.kind === "not_found") {
        return Result.err({ kind: "not_registered" });
      }
      return Result.err({ kind: "db_error", message: "update failed" });
    }

    if (!markResult.value) {
      // Someone else won the race between our read above and this write —
      // it's already watched. Re-fetch for the accurate persisted state
      // rather than fabricating one; no XP award, same as the fast path.
      const refetch = await this.deps.liveClassRegistrationRepo.findByUserAndClass(
        input.userId,
        input.liveClassId,
      );
      if (!refetch.ok || !refetch.value) {
        return Result.err({ kind: "db_error", message: "registration lookup failed" });
      }
      return Result.ok(refetch.value);
    }

    const updated = markRecordingWatched(registration, now);

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
