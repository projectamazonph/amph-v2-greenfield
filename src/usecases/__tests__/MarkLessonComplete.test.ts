import { describe, expect, it, vi } from "vitest";

import type { Course } from "@/domain/entities/Course";
import { createEnrollment } from "@/domain/entities/Enrollment";
import { Result } from "@/domain/shared/Result";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IProgressEventRepository } from "@/ports/repositories/IProgressEventRepository";
import type { Clock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { MarkLessonComplete } from "@/usecases/MarkLessonComplete";

const course = {
  id: "course-1",
  slug: "ppc-foundations",
  title: "PPC Foundations",
  status: "PUBLISHED",
  curriculum: {
    sections: [
      {
        id: "module-1",
        title: "Module 1",
        lessons: [
          { id: "lesson-1", title: "First", type: "TEXT", content: {} },
          { id: "lesson-2", title: "Second", type: "TEXT", content: {} },
        ],
      },
    ],
  },
} as unknown as Course;

function courseRepo(): CourseRepository {
  return {
    findById: vi.fn(async (id: string) =>
      id === course.id ? Result.ok(course) : Result.err({ kind: "not_found" }),
    ),
  } as unknown as CourseRepository;
}

function progressRepo(): IProgressEventRepository {
  return {
    create: vi.fn(async (event) => Result.ok(event)),
    findByUserId: vi.fn(),
    findByCourseId: vi.fn(),
  };
}

const idGen = {
  newId: vi.fn(() => "event-1"),
} as unknown as IdGenerator;

const clock: Clock = { now: () => new Date("2026-08-10T00:00:00.000Z") };

async function setup() {
  const enrollmentRepo = new InMemoryEnrollmentRepository();
  const enrollmentResult = createEnrollment({
    id: "enrollment-1",
    userId: "student-1",
    courseId: course.id,
  });
  if (!enrollmentResult.ok) throw new Error("Enrollment fixture failed");
  await enrollmentRepo.create(enrollmentResult.value);

  const events = progressRepo();
  const useCase = new MarkLessonComplete({
    enrollmentRepo,
    courseRepo: courseRepo(),
    progressEventRepo: events,
    idGen,
    clock,
  });

  return { enrollmentRepo, events, useCase };
}

describe("MarkLessonComplete", () => {
  it("persists owned lesson progress and emits one completion event", async () => {
    const { enrollmentRepo, events, useCase } = await setup();

    const result = await useCase.execute({
      userId: "student-1",
      courseId: course.id,
      lessonId: "lesson-1",
    });

    expect(result).toMatchObject({ ok: true, value: { progressPercent: 50 } });
    const stored = await enrollmentRepo.findByUserIdAndCourseId("student-1", course.id);
    expect(stored?.completedLessonIds).toEqual(["lesson-1"]);
    expect(stored?.lastLessonId).toBe("lesson-1");
    expect(events.create).toHaveBeenCalledTimes(1);
  });

  it("rejects completion of a later lesson before its prerequisite", async () => {
    const { useCase } = await setup();

    const result = await useCase.execute({
      userId: "student-1",
      courseId: course.id,
      lessonId: "lesson-2",
    });

    expect(result).toEqual(
      Result.err({ kind: "prerequisite_locked", previousLessonId: "lesson-1" }),
    );
  });

  it("is idempotent when the same lesson is submitted twice", async () => {
    const { enrollmentRepo, events, useCase } = await setup();
    const input = { userId: "student-1", courseId: course.id, lessonId: "lesson-1" };

    await useCase.execute(input);
    const result = await useCase.execute(input);

    expect(result).toMatchObject({ ok: true, value: { progressPercent: 50 } });
    const stored = await enrollmentRepo.findByUserIdAndCourseId("student-1", course.id);
    expect(stored?.completedLessonIds).toEqual(["lesson-1"]);
    expect(events.create).toHaveBeenCalledTimes(1);
  });

  it("rejects completion without an active enrollment", async () => {
    const { useCase } = await setup();

    const result = await useCase.execute({
      userId: "another-student",
      courseId: course.id,
      lessonId: "lesson-1",
    });

    expect(result).toEqual(Result.err({ kind: "enrollment_not_found" }));
  });

  it("rejects a lesson outside the enrolled course", async () => {
    const { useCase } = await setup();

    const result = await useCase.execute({
      userId: "student-1",
      courseId: course.id,
      lessonId: "lesson-from-another-course",
    });

    expect(result).toEqual(Result.err({ kind: "lesson_not_in_course" }));
  });
});
