import { describe, it, expect, beforeEach } from "vitest";
import { ListCourses } from "@/usecases/ListCourses";
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

describe("ListCourses", () => {
  let repo: InMemoryCourseRepository;
  let useCase: ListCourses;

  beforeEach(() => {
    repo = new InMemoryCourseRepository();
    useCase = new ListCourses(repo);
  });

  it("returns ok=true with empty array when no courses exist", async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.courses).toHaveLength(0);
  });

  it("returns only published courses", async () => {
    repo.seed([makeCourse({ id: "c1", slug: "draft-slug", status: "DRAFT" }), makeCourse({ id: "c2", slug: "pub-slug", status: "PUBLISHED" })]);
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]!.id).toBe("c2");
  });

  it("orders by displayOrder ascending", async () => {
    repo.seed([
      makeCourse({ id: "c1", slug: "s1", title: "Third", displayOrder: 3, status: "PUBLISHED" }),
      makeCourse({ id: "c2", slug: "s2", title: "First", displayOrder: 1, status: "PUBLISHED" }),
      makeCourse({ id: "c3", slug: "s3", title: "Second", displayOrder: 2, status: "PUBLISHED" }),
    ]);
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.courses.map((c: Course) => c.title)).toEqual(["First", "Second", "Third"]);
  });

  it("excludes archived courses", async () => {
    repo.seed([makeCourse({ id: "c1", slug: "archived", status: "ARCHIVED" }), makeCourse({ id: "c2", slug: "pub", status: "PUBLISHED" })]);
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]!.status).toBe("PUBLISHED");
  });
});
