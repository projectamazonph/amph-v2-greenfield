/**
 * ListLiveClassesForStudent — STORY-090.
 *
 * Joins live classes with student enrollments and current RSVPs.
 */

import { describe, expect, it } from "vitest";
import { createLiveClass, type LiveClass } from "@/domain/entities/LiveClass";
import { createLiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import type { Enrollment } from "@/domain/entities/Enrollment";
import { createEnrollment } from "@/domain/entities/Enrollment";
import { ListLiveClassesForStudent } from "@/usecases/ListLiveClassesForStudent";
import { InMemoryLiveClassRegistrationRepository } from "@/infra/repositories/inmemory/InMemoryLiveClassRegistrationRepository";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import { Result } from "@/domain/shared/Result";

function makeClass(opts: { id: string; courseId: string; scheduledAt: Date }) {
  const result = createLiveClass({
    id: opts.id,
    courseId: opts.courseId,
    title: `Class ${opts.id}`,
    scheduledAt: opts.scheduledAt,
    durationMinutes: 60,
    instructorId: "u-1",
    meetingUrl: "https://zoom.example/" + opts.id,
    status: "scheduled",
  });
  if (!result.ok) throw new Error("seed");
  return result.value;
}

function makeLiveClassRepo(classes: ReturnType<typeof makeClass>[]) {
  const repo: ILiveClassRepository = new InMemoryLiveClassRepository();
  for (const c of classes) {
    void repo.create(c);
  }
  return repo;
}

function makeRegistrationRepo() {
  return new InMemoryLiveClassRegistrationRepository();
}

function makeEnrollments(items: Enrollment[]) {
  const repo: IEnrollmentRepository = {
    async findByUserId(userId: string) {
      const filtered = items.filter((e) => e.userId === userId);
      return Result.ok(filtered);
    },
    async findByUserIdAndCourseId(userId: string, courseId: string) {
      const found = items.find((e) => e.userId === userId && e.courseId === courseId);
      return found ?? null;
    },
    async findByCourseId(courseId: string) {
      const filtered = items.filter((e) => e.courseId === courseId);
      return Result.ok(filtered);
    },
    async findById(id: string) {
      const found = items.find((e) => e.id === id);
      if (!found) {
        return Result.err({ kind: "not_found" });
      }
      return Result.ok(found);
    },
    async create(enrollment: Enrollment) {
      items.push(enrollment);
      return Result.ok(enrollment);
    },
    async update(enrollment: Enrollment) {
      const idx = items.findIndex((e) => e.id === enrollment.id);
      if (idx === -1) {
        return Result.err({ kind: "not_found" });
      }
      items[idx] = enrollment;
      return Result.ok(enrollment);
    },
  };
  return repo;
}

const now = new Date("2026-08-01T00:00:00Z");

function makeEnrollment(opts: { id: string; userId: string; courseId: string }): Enrollment {
  const r = createEnrollment({
    id: opts.id,
    userId: opts.userId,
    courseId: opts.courseId,
    createdAt: now,
  });
  if (!r.ok) throw new Error("seed enrollment");
  return r.value;
}

describe("ListLiveClassesForStudent", () => {
  it("returns no classes when the student is not enrolled anywhere", async () => {
    const liveClassRepo = makeLiveClassRepo([
      makeClass({
        id: "lc-1",
        courseId: "c-1",
        scheduledAt: new Date("2026-08-15T10:00:00Z"),
      }),
    ]);
    const useCase = new ListLiveClassesForStudent({
      liveClassRepo,
      liveClassRegistrationRepo: makeRegistrationRepo(),
      enrollmentRepo: makeEnrollments([]),
    });
    const r = await useCase.execute({ userId: "u-2" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });

  it("returns only future classes for enrolled courses", async () => {
    // `createLiveClass` rejects past-dated classes at the factory, so the
    // past entry is hand-constructed to exercise the use case's
    // `scheduledAt > now` filter without the factory blocking it. The
    // future date uses a far-out horizon so the test stays valid
    // regardless of when CI runs it.
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
    const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks out
    const pastClass: LiveClass = {
      id: "lc-2",
      courseId: "c-1",
      title: "Past class",
      scheduledAt: past,
      durationMinutes: 60,
      instructorId: "u-1",
      meetingUrl: "https://zoom.example/lc-2",
      status: "scheduled",
      recordingUrl: null,
      createdAt: past,
      updatedAt: past,
    };
    const liveClassRepo = makeLiveClassRepo([
      makeClass({
        id: "lc-1",
        courseId: "c-1",
        scheduledAt: future,
      }),
      pastClass,
    ]);
    const useCase = new ListLiveClassesForStudent({
      liveClassRepo,
      liveClassRegistrationRepo: makeRegistrationRepo(),
      enrollmentRepo: makeEnrollments([
        makeEnrollment({ id: "e-1", userId: "u-2", courseId: "c-1" }),
      ]),
    });
    const r = await useCase.execute({ userId: "u-2" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(1);
      expect(r.value[0]?.liveClass.id).toBe("lc-1");
    }
  });

  it("sorts by nearest scheduledAt first", async () => {
    const liveClassRepo = makeLiveClassRepo([
      makeClass({
        id: "lc-1",
        courseId: "c-1",
        scheduledAt: new Date("2026-08-20T10:00:00Z"),
      }),
      makeClass({
        id: "lc-2",
        courseId: "c-1",
        scheduledAt: new Date("2026-08-10T10:00:00Z"),
      }),
      makeClass({
        id: "lc-3",
        courseId: "c-1",
        scheduledAt: new Date("2026-08-15T10:00:00Z"),
      }),
    ]);
    const useCase = new ListLiveClassesForStudent({
      liveClassRepo,
      liveClassRegistrationRepo: makeRegistrationRepo(),
      enrollmentRepo: makeEnrollments([
        makeEnrollment({ id: "e-1", userId: "u-2", courseId: "c-1" }),
      ]),
    });
    const r = await useCase.execute({ userId: "u-2" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ids = r.value.map((v) => v.liveClass.id);
      expect(ids).toEqual(["lc-2", "lc-3", "lc-1"]);
    }
  });

  it("attaches the current RSVP for each class", async () => {
    const liveClassRepo = makeLiveClassRepo([
      makeClass({
        id: "lc-1",
        courseId: "c-1",
        scheduledAt: new Date("2026-08-15T10:00:00Z"),
      }),
    ]);
    const liveClassRegistrationRepo = makeRegistrationRepo();
    const regSeed = createLiveClassRegistration({
      id: "r-1",
      userId: "u-2",
      liveClassId: "lc-1",
    });
    if (!regSeed.ok) throw new Error("seed");
    const seed: LiveClassRegistration = {
      ...regSeed.value,
      status: "registered",
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await liveClassRegistrationRepo.create(seed);

    const useCase = new ListLiveClassesForStudent({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo: makeEnrollments([
        makeEnrollment({ id: "e-1", userId: "u-2", courseId: "c-1" }),
      ]),
    });
    const r = await useCase.execute({ userId: "u-2" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]?.registration?.status).toBe("registered");
    }
  });
});
