import { describe, it, expect } from "vitest";
import type { Course } from "@/domain/entities/Course";
import { getLessonData } from "@/app/courses/[slug]/lessons/getLessonData";

/**
 * Tests for the getLessonData helper.
 * This is a pure function that finds a lesson within a course curriculum
 * and computes prev/next lesson IDs.
 */

function makeCourse(lessonIds: string[]): Course {
  // Build a course with 2 sections, 2 lessons each
  return {
    id: "course_01",
    slug: "test-course",
    title: "Test Course",
    tagline: "A test course",
    description: "A course for testing",
    price: { minor: 10000, currency: "PHP", formatted: "PHP 100.00" },
    curriculum: {
      sections: [
        {
          id: "section_01",
          title: "Section 1",
          lessons: [
            { id: lessonIds[0], title: "Lesson 1-1", type: "TEXT", content: { type: "TEXT", body: "" } },
            { id: lessonIds[1], title: "Lesson 1-2", type: "TEXT", content: { type: "TEXT", body: "" } },
          ],
        },
        {
          id: "section_02",
          title: "Section 2",
          lessons: [
            { id: lessonIds[2], title: "Lesson 2-1", type: "TEXT", content: { type: "TEXT", body: "" } },
            { id: lessonIds[3], title: "Lesson 2-2", type: "TEXT", content: { type: "TEXT", body: "" } },
          ],
        },
      ],
    },
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED",
    courseTier: "STARTER",
    previewLessonCount: 1,
    createdAt: new Date(),
  } as unknown as Course;
}

describe("getLessonData", () => {
  it("finds the lesson by ID", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    const result = getLessonData(course, "les_02");
    expect(result).not.toBeNull();
    expect(result!.lesson.id).toBe("les_02");
    expect(result!.lesson.title).toBe("Lesson 1-2");
  });

  it("returns null for nonexistent lesson ID", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    const result = getLessonData(course, "nonexistent");
    expect(result).toBeNull();
  });

  it("computes previous lesson ID (null for first lesson)", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    const result = getLessonData(course, "les_01");
    expect(result!.prevLessonId).toBeNull();
  });

  it("computes next lesson ID (null for last lesson)", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    const result = getLessonData(course, "les_04");
    expect(result!.nextLessonId).toBeNull();
  });

  it("computes prev/next for middle lessons", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    const result = getLessonData(course, "les_02");
    expect(result!.prevLessonId).toBe("les_01");
    expect(result!.nextLessonId).toBe("les_03");
  });

  it("skips prev across section boundary", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    // les_03 is the first lesson of section 2, prev should be les_02
    const result = getLessonData(course, "les_03");
    expect(result!.prevLessonId).toBe("les_02");
  });

  it("returns correct section title", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    const result = getLessonData(course, "les_03");
    expect(result!.sectionTitle).toBe("Section 2");
  });

  it("returns section index (0-based)", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    expect(getLessonData(course, "les_01")!.sectionIndex).toBe(0);
    expect(getLessonData(course, "les_03")!.sectionIndex).toBe(1);
  });

  it("returns lesson index within section", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    expect(getLessonData(course, "les_01")!.lessonIndex).toBe(0);
    expect(getLessonData(course, "les_02")!.lessonIndex).toBe(1);
  });
});
