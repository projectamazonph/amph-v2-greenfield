import { describe, it, expect, beforeEach } from "vitest";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { createCourse } from "@/domain/entities/Course";
import { Result } from "@/lib/Result";
import type { Course } from "@/domain/entities/Course";

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

describe("EnrollStudent", () => {
  let repo: InMemoryCourseRepository;
  let enrollmentCounter = 0;
  let useCase: EnrollStudent;

  beforeEach(() => {
    repo = new InMemoryCourseRepository();
    enrollmentCounter = 0;
    useCase = new EnrollStudent(repo, () => `enrol_${++enrollmentCounter}`);
  });

  it("returns ok=true with enrollmentId on valid published course", async () => {
    const course = makeCourse({ id: "c1", status: "PUBLISHED" });
    repo.seed([course]);

    const result = await useCase.execute("user-1", "c1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.enrollmentId).toBe("enrol_1");
    expect(result.courseId).toBe("c1");
    expect(result.userId).toBe("user-1");
  });

  it("returns course_unpublished when course is DRAFT", async () => {
    const course = makeCourse({ id: "c1", status: "DRAFT" });
    repo.seed([course]);

    const result = await useCase.execute("user-1", "c1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "course_unpublished" });
  });

  it("returns course_unpublished when course is ARCHIVED", async () => {
    const course = makeCourse({ id: "c1", status: "ARCHIVED" });
    repo.seed([course]);

    const result = await useCase.execute("user-1", "c1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "course_unpublished" });
  });

  it("returns not_found when course does not exist", async () => {
    const result = await useCase.execute("user-1", "nonexistent");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "not_found" });
  });

  it("returns invalid_user when userId is empty", async () => {
    const result = await useCase.execute("", "c1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_user" });
  });

  it("returns invalid_user when userId is whitespace", async () => {
    const result = await useCase.execute("   ", "c1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_user" });
  });

  it("generates unique enrollmentIds per enrollment", async () => {
    const c1 = makeCourse({ id: "c1", status: "PUBLISHED" });
    const c2 = makeCourse({ id: "c2", status: "PUBLISHED", slug: "another-slug" });
    repo.seed([c1, c2]);

    const r1 = await useCase.execute("user-1", "c1");
    const r2 = await useCase.execute("user-1", "c2");

    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r1.enrollmentId).not.toBe(r2.enrollmentId);
  });
});
