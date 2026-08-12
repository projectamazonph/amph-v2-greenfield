import { describe, it, expect } from "vitest";
import type { Course } from "@/domain/entities/Course";
import type { Lesson } from "@/domain/entities/Lesson";
import type { CatalogCourseDetail } from "@/usecases/GetCatalogCourse";
import {
  getLessonData,
  nextIncompleteLesson,
  withCatalogCurriculum,
} from "@/app/courses/[slug]/lessons/getLessonData";

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
            {
              id: lessonIds[0],
              title: "Lesson 1-1",
              type: "TEXT",
              content: { type: "TEXT", body: "" },
            },
            {
              id: lessonIds[1],
              title: "Lesson 1-2",
              type: "TEXT",
              content: { type: "TEXT", body: "" },
            },
          ],
        },
        {
          id: "section_02",
          title: "Section 2",
          lessons: [
            {
              id: lessonIds[2],
              title: "Lesson 2-1",
              type: "TEXT",
              content: { type: "TEXT", body: "" },
            },
            {
              id: lessonIds[3],
              title: "Lesson 2-2",
              type: "TEXT",
              content: { type: "TEXT", body: "" },
            },
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

describe("withCatalogCurriculum", () => {
  it("uses catalog rows for navigation and selected persisted content", () => {
    const course = makeCourse(["legacy-1", "legacy-2", "legacy-3", "legacy-4"]);
    const detail = {
      courseId: course.id,
      slug: course.slug,
      title: course.title,
      tagline: course.tagline,
      description: course.description,
      priceMinor: course.price.minor,
      currency: "PHP",
      coverImage: null,
      status: "PUBLISHED",
      totalLessonCount: 2,
      totalEstimatedMinutes: 0,
      modules: [
        {
          id: "module-1",
          title: "Current module",
          displayOrder: 1,
          lessons: [
            {
              id: "lesson-current",
              title: "Current lesson",
              type: "TEXT",
              estimatedMinutes: 0,
              displayOrder: 1,
            },
            {
              id: "lesson-next",
              title: "Next lesson",
              type: "VIDEO",
              estimatedMinutes: 5,
              displayOrder: 2,
            },
          ],
        },
      ],
    } satisfies CatalogCourseDetail;
    const selectedLesson = {
      id: "lesson-current",
      moduleId: "module-1",
      title: "Current lesson",
      type: "TEXT",
      content: { body: "persisted" },
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Lesson;
    const result = withCatalogCurriculum(course, detail, selectedLesson);
    expect(result.curriculum.sections[0]?.lessons.map((lesson) => lesson.id)).toEqual([
      "lesson-current",
      "lesson-next",
    ]);
    expect(result.curriculum.sections[0]?.lessons[0]?.content).toEqual({ body: "persisted" });
  });
});

// ── nextIncompleteLesson ──────────────────────────────────────────

describe("nextIncompleteLesson", () => {
  it("returns first incomplete lesson when none are completed", () => {
    // 4 IDs → 4 lessons (2 per section) to avoid undefined id on lessonIds[3]
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    const result = nextIncompleteLesson(course, [], "les_01");
    expect(result!.id).toBe("les_02"); // next in curriculum after les_01
  });

  it("skips completed lessons", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    // les_01, les_02 are completed, current is les_01
    const result = nextIncompleteLesson(course, ["les_01", "les_02"], "les_01");
    expect(result!.id).toBe("les_03");
  });

  it("returns null when all lessons are complete", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    const result = nextIncompleteLesson(course, ["les_01", "les_02", "les_03", "les_04"], "les_01");
    expect(result).toBeNull();
  });

  it("skips lessons before current lesson (only looks forward)", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    // les_01 is completed, but we're on les_02 — should find les_03
    const result = nextIncompleteLesson(course, ["les_01"], "les_02");
    expect(result!.id).toBe("les_03");
  });

  it("finds next incomplete in next section", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    // les_01 completed, current is les_02 (last in section 1)
    const result = nextIncompleteLesson(course, ["les_01"], "les_02");
    expect(result!.id).toBe("les_03"); // first incomplete in section 2
  });

  it("returns null when current lesson is last and no others incomplete", () => {
    const course = makeCourse(["les_01", "les_02", "les_03", "les_04"]);
    // les_01, les_02 completed, current is les_03 (last), no incomplete after
    const result = nextIncompleteLesson(course, ["les_01", "les_02", "les_03", "les_04"], "les_04");
    expect(result).toBeNull();
  });
});
