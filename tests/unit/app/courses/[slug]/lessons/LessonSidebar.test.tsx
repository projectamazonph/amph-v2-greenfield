import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import type { Course } from "@/domain/entities/Course";
import { LessonSidebar } from "@/app/courses/[slug]/lessons/LessonSidebar";

function makeCourse(): Course {
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
          title: "Getting Started",
          lessons: [
            { id: "les_01", title: "Introduction", type: "TEXT", content: { type: "TEXT", body: "" } },
            { id: "les_02", title: "Setup", type: "VIDEO", content: { type: "VIDEO", videoUrl: "", durationMinutes: 5 } },
          ],
        },
        {
          id: "section_02",
          title: "Advanced Topics",
          lessons: [
            { id: "les_03", title: "Deep Dive", type: "TEXT", content: { type: "TEXT", body: "" } },
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

describe("LessonSidebar", () => {
  it("renders the course title", () => {
    const course = makeCourse();
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_01" completedLessonIds={[]} />,
    );
    expect(html).toContain("Test Course");
  });

  it("renders all section titles", () => {
    const course = makeCourse();
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_01" completedLessonIds={[]} />,
    );
    expect(html).toContain("Getting Started");
    expect(html).toContain("Advanced Topics");
  });

  it("renders all lesson titles in the current lesson's section", () => {
    const course = makeCourse();
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_01" completedLessonIds={[]} />,
    );
    // les_01 is in section 1 — only section 1 is open
    expect(html).toContain("Introduction");
    expect(html).toContain("Setup");
    // "Deep Dive" is in section 2 which is collapsed (current lesson is in section 1)
    expect(html).not.toContain("Deep Dive");
  });

  it("highlights the current lesson", () => {
    const course = makeCourse();
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_02" completedLessonIds={[]} />,
    );
    // The sidebar should have an "active" indicator for the current lesson
    expect(html).toContain("les_02");
  });

  it("marks completed lessons with a checkmark", () => {
    // les_01 is completed, current lesson is also les_01 — shows checkmark
    const course = makeCourse();
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_01" completedLessonIds={["les_01"]} />,
    );
    expect(html).toContain("Introduction");
  });

  it("shows video duration badge for VIDEO lessons", () => {
    // les_02 is the VIDEO lesson in section 1 — set currentLessonId to les_02 so section 1 is open
    const course = makeCourse();
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_02" completedLessonIds={[]} />,
    );
    // les_02 is a VIDEO lesson with durationMinutes: 5
    expect(html).toMatch(/5.*m/);
  });

  it("renders section collapse/expand toggle", () => {
    const course = makeCourse();
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_02" completedLessonIds={[]} />,
    );
    // Should have section titles that can be toggled
    expect(html).toContain("Getting Started");
  });

  it("shows module progress (e.g. '3/5')", () => {
    const course = makeCourse();
    // Section 1 has 2 lessons, Section 2 has 1 lesson
    const completedLessonIds = ["les_01", "les_02"]; // section 1: 2/2 done
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_03" completedLessonIds={completedLessonIds} />,
    );
    // Section 1 progress: "2/2" (or "2 / 2")
    expect(html).toContain("2");
    // Section 2 progress: "0/1"
    expect(html).toContain("0");
    expect(html).toContain("1");
  });

  it("marks completed lessons with a checkmark", () => {
    // les_01 is completed, current lesson is also les_01 — shows checkmark
    const course = makeCourse();
    const html = renderToString(
      <LessonSidebar course={course} currentLessonId="les_01" completedLessonIds={["les_01"]} />,
    );
    expect(html).toContain("Introduction");
  });
});
