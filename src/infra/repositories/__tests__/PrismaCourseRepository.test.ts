import { describe, expect, it } from "vitest";
import { PrismaCourseRepository } from "@/infra/repositories/PrismaCourseRepository";

describe("PrismaCourseRepository", () => {
  it("preserves persisted course access settings", async () => {
    const db = {
      course: {
        findUnique: async () => ({
          id: "course-1",
          slug: "pro-course",
          title: "Pro Course",
          tagline: "",
          description: "Course",
          priceMinor: 10000,
          currency: "PHP",
          curriculum: {
            sections: [
              {
                id: "section-1",
                title: "Section",
                lessons: [{ id: "lesson-1", title: "Lesson", type: "TEXT", content: {} }],
              },
            ],
          },
          coverImage: null,
          isPublished: true,
          isFeatured: false,
          displayOrder: 1,
          courseTier: "PRO",
          previewLessonCount: 3,
          createdAt: new Date("2026-08-13T00:00:00.000Z"),
          updatedAt: new Date("2026-08-13T00:00:00.000Z"),
        }),
      },
    };
    const result = await new PrismaCourseRepository(db as never).findById("course-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courseTier).toBe("PRO");
    expect(result.value.previewLessonCount).toBe(3);
  });
});
