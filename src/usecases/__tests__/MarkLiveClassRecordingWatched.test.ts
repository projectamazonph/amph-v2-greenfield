/**
 * MarkLiveClassRecordingWatched — STORY-100.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createLiveClassRegistration,
  type LiveClassRegistration,
} from "@/domain/entities/LiveClassRegistration";
import { createLiveClass, updateLiveClass } from "@/domain/entities/LiveClass";
import { MarkLiveClassRecordingWatched } from "@/usecases/MarkLiveClassRecordingWatched";
import type { AwardXP } from "@/usecases/AwardXP";
import { InMemoryLiveClassRegistrationRepository } from "@/infra/repositories/inmemory/InMemoryLiveClassRegistrationRepository";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { FixedClock } from "@/ports/system/Clock";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import { SilentLogger } from "@/infra/observability/SilentLogger";

const activeEnrollmentRepo = {
  findByUserIdAndCourseId: async () => ({ status: "active" }),
} as unknown as IEnrollmentRepository;

function makeCompletedClassWithRecording(): ReturnType<typeof createLiveClass> {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const created = createLiveClass({
    id: "lc-1",
    courseId: "c-1",
    title: "Bid elevator clinic",
    scheduledAt: future,
    durationMinutes: 60,
    instructorId: "u-1",
    meetingUrl: "https://zoom.example/lc-1",
    status: "scheduled",
  });
  if (!created.ok) throw new Error("seed");
  // completed + recordingUrl can only be set via a patch, mirroring how the
  // admin edit flow would actually transition a real class.
  return updateLiveClass(created.value, {
    status: "completed",
    recordingUrl: "https://vimeo.com/12345",
  });
}

function makeRepo(): ILiveClassRepository {
  const repo = new InMemoryLiveClassRepository();
  const cls = makeCompletedClassWithRecording();
  if (!cls.ok) throw new Error("seed");
  void repo.create(cls.value);
  return repo;
}

const mockAwardXp: AwardXP & { execute: ReturnType<typeof vi.fn> } = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: vi.fn() as any,
} as AwardXP & { execute: ReturnType<typeof vi.fn> };

describe("MarkLiveClassRecordingWatched", () => {
  beforeEach(() => {
    mockAwardXp.execute.mockClear();
    mockAwardXp.execute.mockResolvedValue({
      ok: true,
      value: { xpEvent: null as unknown, totalXp: 15, applied: true },
    });
  });

  it("marks the registration watched and awards XP for a registered user", async () => {
    const liveClassRepo = makeRepo();
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const seed = createLiveClassRegistration({ id: "r-1", userId: "u-2", liveClassId: "lc-1" });
    if (!seed.ok) throw new Error("seed");
    await liveClassRegistrationRepo.create(seed.value);

    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: activeEnrollmentRepo,
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date("2026-08-03T00:00:00Z")),
      logger: new SilentLogger(),
    });
    const r = await useCase.execute({ userId: "u-2", liveClassId: "lc-1" });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("attended");
      expect(r.value.watchedRecordingAt).toEqual(new Date("2026-08-03T00:00:00Z"));
    }
    expect(mockAwardXp.execute).toHaveBeenCalledWith({
      userId: "u-2",
      amount: 15,
      reason: "live_class_attended",
      refId: "lc-1",
      idempotencyKey: "live_class_attended:u-2:lc-1",
    });
  });

  it("is idempotent — a second call retries the same XP award key", async () => {
    const liveClassRepo = makeRepo();
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const seed = createLiveClassRegistration({ id: "r-1", userId: "u-2", liveClassId: "lc-1" });
    if (!seed.ok) throw new Error("seed");
    await liveClassRegistrationRepo.create(seed.value);

    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: activeEnrollmentRepo,
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date("2026-08-03T00:00:00Z")),
      logger: new SilentLogger(),
    });
    await useCase.execute({ userId: "u-2", liveClassId: "lc-1" });
    mockAwardXp.execute.mockClear();

    const r = await useCase.execute({ userId: "u-2", liveClassId: "lc-1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.watchedRecordingAt).toEqual(new Date("2026-08-03T00:00:00Z"));
    expect(mockAwardXp.execute).toHaveBeenCalledWith({
      userId: "u-2",
      amount: 15,
      reason: "live_class_attended",
      refId: "lc-1",
      idempotencyKey: "live_class_attended:u-2:lc-1",
    });
  });

  it("is race-safe — two concurrent calls award XP exactly once", async () => {
    // Regression for a real bug found in review: the old implementation
    // read watchedRecordingAt, checked it in-process, then wrote
    // unconditionally — two calls in flight before either write landed
    // could both pass the check and both award XP.
    // `markRecordingWatched()` on the repo is now the atomic guard, and
    // this drives two `execute()` calls concurrently (not sequentially)
    // against the *same* repo instance to exercise it.
    const liveClassRepo = makeRepo();
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const seed = createLiveClassRegistration({ id: "r-1", userId: "u-2", liveClassId: "lc-1" });
    if (!seed.ok) throw new Error("seed");
    await liveClassRegistrationRepo.create(seed.value);

    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: activeEnrollmentRepo,
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date("2026-08-03T00:00:00Z")),
      logger: new SilentLogger(),
    });

    const [r1, r2] = await Promise.all([
      useCase.execute({ userId: "u-2", liveClassId: "lc-1" }),
      useCase.execute({ userId: "u-2", liveClassId: "lc-1" }),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(mockAwardXp.execute).toHaveBeenCalledTimes(2);
    expect(mockAwardXp.execute.mock.calls[0]![0].idempotencyKey).toBe(
      "live_class_attended:u-2:lc-1",
    );
    expect(mockAwardXp.execute.mock.calls[1]![0].idempotencyKey).toBe(
      "live_class_attended:u-2:lc-1",
    );
  });

  it("returns not_found when the live class does not exist", async () => {
    const liveClassRepo = new InMemoryLiveClassRepository();
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: activeEnrollmentRepo,
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date()),
      logger: new SilentLogger(),
    });
    const r = await useCase.execute({ userId: "u-2", liveClassId: "missing" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("not_found");
  });

  it("returns recording_not_available when the class isn't completed yet", async () => {
    const liveClassRepo = new InMemoryLiveClassRepository();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const cls = createLiveClass({
      id: "lc-2",
      courseId: "c-1",
      title: "Still scheduled",
      scheduledAt: future,
      durationMinutes: 60,
      instructorId: "u-1",
      meetingUrl: "https://zoom.example/lc-2",
      status: "scheduled",
    });
    if (!cls.ok) throw new Error("seed");
    await liveClassRepo.create(cls.value);
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const seed = createLiveClassRegistration({ id: "r-1", userId: "u-2", liveClassId: "lc-2" });
    if (!seed.ok) throw new Error("seed");
    await liveClassRegistrationRepo.create(seed.value);

    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: activeEnrollmentRepo,
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date()),
      logger: new SilentLogger(),
    });
    const r = await useCase.execute({ userId: "u-2", liveClassId: "lc-2" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("recording_not_available");
    expect(mockAwardXp.execute).not.toHaveBeenCalled();
  });

  it("returns recording_not_available when completed but no recording is posted", async () => {
    const liveClassRepo = new InMemoryLiveClassRepository();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const created = createLiveClass({
      id: "lc-3",
      courseId: "c-1",
      title: "No recording yet",
      scheduledAt: future,
      durationMinutes: 60,
      instructorId: "u-1",
      meetingUrl: "https://zoom.example/lc-3",
      status: "scheduled",
    });
    if (!created.ok) throw new Error("seed");
    const completed = updateLiveClass(created.value, { status: "completed" });
    if (!completed.ok) throw new Error("seed");
    await liveClassRepo.create(completed.value);
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const seed = createLiveClassRegistration({ id: "r-1", userId: "u-2", liveClassId: "lc-3" });
    if (!seed.ok) throw new Error("seed");
    await liveClassRegistrationRepo.create(seed.value);

    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: activeEnrollmentRepo,
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date()),
      logger: new SilentLogger(),
    });
    const r = await useCase.execute({ userId: "u-2", liveClassId: "lc-3" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("recording_not_available");
  });

  it("returns not_registered when the user never RSVPd", async () => {
    const liveClassRepo = makeRepo();
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: activeEnrollmentRepo,
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date()),
      logger: new SilentLogger(),
    });
    const r = await useCase.execute({ userId: "u-2", liveClassId: "lc-1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("not_registered");
  });

  it("returns not_registered when the user's RSVP was cancelled", async () => {
    const liveClassRepo = makeRepo();
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const seed = createLiveClassRegistration({ id: "r-1", userId: "u-2", liveClassId: "lc-1" });
    if (!seed.ok) throw new Error("seed");
    const cancelled: LiveClassRegistration = {
      ...seed.value,
      status: "cancelled",
      cancelledAt: new Date(),
    };
    await liveClassRegistrationRepo.create(cancelled);

    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: activeEnrollmentRepo,
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date()),
      logger: new SilentLogger(),
    });
    const r = await useCase.execute({ userId: "u-2", liveClassId: "lc-1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("not_registered");
  });

  it("rejects a recording watch when active course access has ended", async () => {
    const liveClassRepo = makeRepo();
    const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
    const seed = createLiveClassRegistration({ id: "r-1", userId: "u-2", liveClassId: "lc-1" });
    if (!seed.ok) throw new Error("seed");
    await liveClassRegistrationRepo.create(seed.value);
    const useCase = new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: {
        ...activeEnrollmentRepo,
        findByUserIdAndCourseId: async () => null,
      },
      awardXp: mockAwardXp,
      clock: new FixedClock(new Date()),
      logger: new SilentLogger(),
    });

    const result = await useCase.execute({ userId: "u-2", liveClassId: "lc-1" });

    expect(result).toEqual({ ok: false, error: { kind: "course_access_required" } });
    expect(mockAwardXp.execute).not.toHaveBeenCalled();
  });
});
