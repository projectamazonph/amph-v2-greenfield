import { describe, it, expect, beforeEach } from "vitest";
import { GetCourse } from "@/usecases/GetCourse";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { createCourse, type Course } from "@/domain/entities/Course";
import { Result } from "@/lib/Result";

function makeCourse(overrides: Partial<Parameters<typeof createCourse>[0]> = {}): Course {
  const r = createCourse({
    id: "c0",
    slug: "placeholder-slug",
    title: "Placeholder",
    tagline: "Learn it.",
    description: "A course.",
    priceMinor: 0,
    curriculum: { sections: [{ id: "s1", title: "Intro", lessons: [{ id: "l1", title: "Welcome", type: "VIDEO", content: { durationMinutes: 5 } }] }] },
    status: "PUBLISHED",
    displayOrder: 0,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  });
  if (Result.isErr(r)) throw new Error("bad test fixture: " + JSON.stringify(r.error));
  return r.value;
}

describe("GetCourse", () => {
  let repo: InMemoryCourseRepository;
  let useCase: GetCourse;

  beforeEach(() => {
    repo = new InMemoryCourseRepository();
    useCase = new GetCourse(repo);
  });

  it("returns the course when found by slug and PUBLISHED", async () => {
    const course = makeCourse({ id: "c1", slug: "fba-mastery", title: "FBA Mastery" });
    repo.seed([course]);

    const result = await useCase.execute("fba-mastery");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.course.title).toBe("FBA Mastery");
  });

  it("returns not_found when course slug does not exist", async () => {
    const result = await useCase.execute("nonexistent-slug");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "not_found" });
  });

  it("returns not_found when course is DRAFT", async () => {
    const course = makeCourse({ id: "c1", slug: "draft-course", status: "DRAFT" });
    repo.seed([course]);

    const result = await useCase.execute("draft-course");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "not_found" });
  });

  it("returns not_found when course is ARCHIVED", async () => {
    const course = makeCourse({ id: "c1", slug: "old-course", status: "ARCHIVED" });
    repo.seed([course]);

    const result = await useCase.execute("old-course");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "not_found" });
  });

  it("returns not_found for empty slug", async () => {
    const result = await useCase.execute("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "not_found" });
  });

  it("slug lookup is case-sensitive", async () => {
    const course = makeCourse({ id: "c1", slug: "fba-mastery", status: "PUBLISHED" });
    repo.seed([course]);

    const result = await useCase.execute("FBA-MASTERY");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "not_found" });
  });
});
