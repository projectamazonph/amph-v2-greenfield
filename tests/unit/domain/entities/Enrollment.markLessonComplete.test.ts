import { describe, it, expect } from "vitest";
import { Enrollment, createEnrollment } from "@/domain/entities/Enrollment";
import { Result } from "@/domain/shared/Result";

function makeEnrollment(overrides: Partial<{
  completedLessonIds: string[];
  lastLessonId: string | null;
  progressPercent: number;
}> = {}): Enrollment {
  const result = createEnrollment({
    id: "enroll_01",
    userId: "user_01",
    courseId: "course_01",
  });
  if (!Result.isOk(result)) throw new Error("expected ok");
  const e = result.value;
  e.completedLessonIds = overrides.completedLessonIds ?? [];
  e.lastLessonId = overrides.lastLessonId ?? null;
  e.progressPercent = overrides.progressPercent ?? 0;
  return e;
}

describe("Enrollment.markLessonComplete", () => {
  describe("basic behavior", () => {
    it("appends lessonId to completedLessonIds", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_01", 10);
      expect(e.completedLessonIds).toContain("les_01");
      expect(e.completedLessonIds.length).toBe(1);
    });

    it("sets lastLessonId to the completed lesson", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_03", 5);
      expect(e.lastLessonId).toBe("les_03");
    });

    it("computes progressPercent: 1/4 = 25", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_01", 4);
      expect(e.progressPercent).toBe(25);
    });

    it("computes progressPercent: 2/4 = 50", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_01", 4);
      e.markLessonComplete("les_02", 4);
      expect(e.progressPercent).toBe(50);
    });

    it("computes progressPercent: 4/4 = 100", () => {
      const e = makeEnrollment();
      [1, 2, 3, 4].forEach((n) => e.markLessonComplete(`les_0${n}`, 4));
      expect(e.progressPercent).toBe(100);
    });

    it("computes progressPercent: 1/10 = 10", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_01", 10);
      expect(e.progressPercent).toBe(10);
    });

    it("computes progressPercent: 3/10 = 30", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_01", 10);
      e.markLessonComplete("les_02", 10);
      e.markLessonComplete("les_03", 10);
      expect(e.progressPercent).toBe(30);
    });

    it("computes progressPercent: 0/10 = 0", () => {
      const e = makeEnrollment();
      expect(e.progressPercent).toBe(0);
    });

    it("updates lastLessonId on subsequent completions", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_01", 5);
      e.markLessonComplete("les_02", 5);
      expect(e.lastLessonId).toBe("les_02");
    });
  });

  describe("idempotency", () => {
    it("does NOT duplicate if lesson already completed", () => {
      const e = makeEnrollment({ completedLessonIds: ["les_01"] });
      e.markLessonComplete("les_01", 5);
      // Should only have les_01 once
      expect(e.completedLessonIds.filter((id) => id === "les_01").length).toBe(1);
      expect(e.completedLessonIds.length).toBe(1);
      // Progress should not change (1/5 = 20%)
      expect(e.progressPercent).toBe(20);
    });

    it("is idempotent: calling twice with same lessonId = same state", () => {
      const e1 = makeEnrollment();
      e1.markLessonComplete("les_01", 3);
      e1.markLessonComplete("les_01", 3);

      const e2 = makeEnrollment();
      e2.markLessonComplete("les_01", 3);

      expect(e1.completedLessonIds).toEqual(e2.completedLessonIds);
      expect(e1.progressPercent).toBe(e2.progressPercent);
    });
  });

  describe("course completed (100%)", () => {
    it("sets progressPercent to 100 when all lessons completed", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_01", 1);
      expect(e.progressPercent).toBe(100);
    });

    it("marks all lessons in sequence → 100%", () => {
      const e = makeEnrollment();
      e.markLessonComplete("les_01", 3);
      expect(e.progressPercent).toBe(33); // floor(1/3 * 100)
      e.markLessonComplete("les_02", 3);
      expect(e.progressPercent).toBe(66); // floor(2/3 * 100)
      e.markLessonComplete("les_03", 3);
      expect(e.progressPercent).toBe(100);
    });
  });
});
