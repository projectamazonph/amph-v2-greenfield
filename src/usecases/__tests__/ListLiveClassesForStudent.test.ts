/**
 * ListLiveClassesForStudent — STORY-090.
 *
 * Joins live classes with student enrollments and current RSVPs.
 */

import { describe, expect, it } from "vitest";
import { createLiveClass } from "@/domain/entities/LiveClass";
import { createLiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import type { Enrollment } from "@/domain/entities/Enrollment";
import { ListLiveClassesForStudent } from "@/usecases/ListLiveClassesForStudent";
import { InMemoryLiveClassRegistrationRepository } from "@/infra/repositories/inmemory/InMemoryLiveClassRegistrationRepository";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import { Result } from "@/domain/shared/Result";

function makeClass(opts: {
  id: string;
  courseId: string;
  scheduledAt: Date;
}) {
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
  };
  return repo;
}

const now = new Date("2026-08-01T00:00:00Z");

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
    const liveClassRepo = makeLiveClassRepo([
      makeClass({
        id: "lc-1",
        courseId: "c-1",
        scheduledAt: new Date("2026-08-15T10:00:00Z"),
      }),
      makeClass({
        id: "lc-2",
        courseId: "c-1",
        scheduledAt: new Date("2026-07-15T10:00:00Z"),
      }),
    ]);
    const useCase = new ListLiveClassesForStudent({
      liveClassRepo,
      liveClassRegistrationRepo: makeRegistrationRepo(),
      enrollmentRepo: makeEnrollments([
        {
          id: "e-1",
          userId: "u-2",
          courseId: "c-1",
          status: "active",
          source: "direct",
          completedLessonIds: [],
          progressPercent: 0,
          createdAt: now,
          updatedAt: now,
        },
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
        {
          id: "e-1",
          userId: "u-2",
          courseId: "c-1",
          status: "active",
          source: "direct",
          completedLessonIds: [],
          progressPercent: 0,
          createdAt: now,
          updatedAt: now,
        },
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
        {
          id: "e-1",
          userId: "u-2",
          courseId: "c-1",
          status: "active",
          source: "direct",
          completedLessonIds: [],
          progressPercent: 0,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    });
    const r = await useCase.execute({ userId: "u-2" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]?.registration?.status).toBe("registered");
    }
  });
});