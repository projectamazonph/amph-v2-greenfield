/**
 * AdminListCourses.test.ts — STORY-048a.
 *
 * Tier B coverage for the AdminListCourses use case.
 * Covers: no filters, status filter, search, pagination, combinations,
 * empty results, page beyond last, pageSize cap.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminListCourses } from "@/usecases/AdminListCourses";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { createCourse, type Course } from "@/domain/entities/Course";

function makeCourse(overrides: Partial<Course> = {}): Course {
  const r = createCourse({
    id: `course_${Math.random().toString(36).slice(2, 8)}`,
    slug: `course-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Course",
    tagline: "Tagline",
    description: "Description",
    priceMinor: 1000,
    curriculum: {
      sections: [
        { id: "s1", title: "Section 1", lessons: [{ id: "l1", title: "Lesson 1", type: "TEXT", content: "" }] },
      ],
    },
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

// Per-test counter to guarantee unique slugs even across multiple
// seed() calls in the same test. Reset in beforeEach via the seed helper.
let seedCounter = 0;
function nextId(): string {
  seedCounter++;
  return `c${seedCounter.toString().padStart(4, "0")}`;
}

async function seed(repo: InMemoryCourseRepository, count: number, status: Course["status"] = "PUBLISHED"): Promise<Course[]> {
  const out: Course[] = [];
  // Slug must be lowercase only (kebab-case per the createCourse regex)
  const statusSlug = status.toLowerCase();
  for (let i = 0; i < count; i++) {
    const c = makeCourse({
      id: nextId(),
      slug: `slug-${statusSlug}-${seedCounter}-${Math.random().toString(36).slice(2, 8)}`,
      title: i % 2 === 0 ? "Alpha Course" : "Beta Course",
      status,
      displayOrder: i,
    });
    await repo.create(c);
    out.push(c);
  }
  return out;
}

describe("AdminListCourses", () => {
  let courseRepo: InMemoryCourseRepository;
  let useCase: AdminListCourses;

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    useCase = new AdminListCourses({ courseRepo });
    seedCounter = 0;
  });

  it("returns all courses when no filters are provided", async () => {
    await seed(courseRepo, 5);

    const result = await useCase.execute({});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courses.length).toBe(5);
    expect(result.value.totalCount).toBe(5);
  });

  it("returns DRAFT courses (admin sees all statuses)", async () => {
    await seed(courseRepo, 2, "DRAFT");
    await seed(courseRepo, 3, "PUBLISHED");

    const result = await useCase.execute({});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalCount).toBe(5);
  });

  it("returns ARCHIVED courses (admin sees all statuses)", async () => {
    await seed(courseRepo, 2, "ARCHIVED");

    const result = await useCase.execute({});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalCount).toBe(2);
  });

  it("returns empty list with totalCount=0 when the repo is empty", async () => {
    const result = await useCase.execute({});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courses).toEqual([]);
    expect(result.value.totalCount).toBe(0);
  });

  it("filters by status", async () => {
    await seed(courseRepo, 2, "DRAFT");
    await seed(courseRepo, 3, "PUBLISHED");
    await seed(courseRepo, 1, "ARCHIVED");

    const result = await useCase.execute({ status: "PUBLISHED" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalCount).toBe(3);
    expect(result.value.courses.every((c) => c.status === "PUBLISHED")).toBe(true);
  });

  it("filters by search (case-insensitive substring on title + slug)", async () => {
    await courseRepo.create(makeCourse({ id: "c1", slug: "intro-fba-x", title: "Intro to FBA" }));
    await courseRepo.create(makeCourse({ id: "c2", slug: "advanced-fba-x", title: "Advanced FBA" }));
    await courseRepo.create(makeCourse({ id: "c3", slug: "seller-central-x", title: "Seller Central" }));

    const result = await useCase.execute({ search: "intro" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalCount).toBe(1);
    expect(result.value.courses[0]?.id).toBe("c1");
  });

  it("search is case-insensitive", async () => {
    await courseRepo.create(makeCourse({ id: "c1", slug: "intro-fba-y", title: "INTRO TO FBA" }));

    const result = await useCase.execute({ search: "intro" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalCount).toBe(1);
  });

  it("search matches on slug too", async () => {
    await courseRepo.create(makeCourse({ id: "c1", slug: "intro-fba-z", title: "Different Title" }));
    await courseRepo.create(makeCourse({ id: "c2", slug: "other-z", title: "Intro to Something" }));

    const result = await useCase.execute({ search: "intro-fba-z" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalCount).toBe(1);
    expect(result.value.courses[0]?.id).toBe("c1");
  });

  it("paginates correctly (page 1 of 2 with pageSize=2)", async () => {
    await seed(courseRepo, 5);

    const result = await useCase.execute({ page: 1, pageSize: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courses.length).toBe(2);
    expect(result.value.totalCount).toBe(5);
    expect(result.value.page).toBe(1);
    expect(result.value.pageSize).toBe(2);
  });

  it("paginates correctly (page 2 of 2 with pageSize=2 has 2 courses)", async () => {
    await seed(courseRepo, 5);

    const result = await useCase.execute({ page: 2, pageSize: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courses.length).toBe(2);
  });

  it("paginates correctly (page 3 of 2 with pageSize=2 has 1 course)", async () => {
    await seed(courseRepo, 5);

    const result = await useCase.execute({ page: 3, pageSize: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courses.length).toBe(1);
  });

  it("returns empty courses but correct totalCount when page is beyond last", async () => {
    await seed(courseRepo, 5);

    const result = await useCase.execute({ page: 99, pageSize: 10 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courses).toEqual([]);
    expect(result.value.totalCount).toBe(5);
  });

  it("uses default page=1 and pageSize=25 when not provided", async () => {
    await seed(courseRepo, 30);

    const result = await useCase.execute({});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.page).toBe(1);
    expect(result.value.pageSize).toBe(25);
    expect(result.value.courses.length).toBe(25);
  });

  it("caps pageSize at 100", async () => {
    await seed(courseRepo, 1);

    const result = await useCase.execute({ pageSize: 9999 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pageSize).toBeLessThanOrEqual(100);
  });

  it("clamps page < 1 to page=1", async () => {
    await seed(courseRepo, 3);

    const result = await useCase.execute({ page: 0, pageSize: 10 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.page).toBe(1);
  });

  it("combines search + status filter", async () => {
    await courseRepo.create(makeCourse({ id: "c1", slug: "intro-fba-w", title: "Intro to FBA", status: "DRAFT" }));
    await courseRepo.create(makeCourse({ id: "c2", slug: "advanced-fba-w", title: "Advanced FBA", status: "PUBLISHED" }));
    await courseRepo.create(makeCourse({ id: "c3", slug: "intro-seller-w", title: "Intro to Seller", status: "PUBLISHED" }));

    const result = await useCase.execute({ search: "intro", status: "PUBLISHED" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalCount).toBe(1);
    expect(result.value.courses[0]?.id).toBe("c3");
  });

  it("sorts by displayOrder then createdAt", async () => {
    await courseRepo.create(makeCourse({ id: "c1", slug: "a-1", title: "A", displayOrder: 2 }));
    await courseRepo.create(makeCourse({ id: "c2", slug: "b-1", title: "B", displayOrder: 1 }));
    await courseRepo.create(makeCourse({ id: "c3", slug: "c-1", title: "C", displayOrder: 1 }));

    const result = await useCase.execute({});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // c2 (displayOrder=1) and c3 (displayOrder=1) come first, then c1
    expect(result.value.courses.map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
  });

  it("returns db_error when the repo errors", async () => {
    const repo = new InMemoryCourseRepository();
    repo.listAll = async () => ({
      ok: false,
      error: { kind: "db_error", message: "list failed" },
    });
    useCase = new AdminListCourses({ courseRepo: repo });

    const result = await useCase.execute({});

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("list failed");
  });
});
