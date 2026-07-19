/**
 * AdminListCourses — paginated, filterable list of courses for the admin panel.
 *
 * STORY-048a: Admin courses CRUD.
 *
 * Unlike the public-facing `ListCourses` (which only returns PUBLISHED
 * courses), this use case returns courses in ANY status. The admin
 * page needs to see DRAFT, PUBLISHED, and ARCHIVED courses.
 *
 * Flow:
 *  1. Load all courses from the repo via listAll
 *  2. Apply status + search filters in-memory
 *  3. Sort by displayOrder, then createdAt
 *  4. Slice for the requested page
 *  5. Return { courses, totalCount, page, pageSize }
 *
 * Defaults: page=1, pageSize=25. pageSize capped at 100.
 */

import { Result } from "@/domain/shared/Result";
import type { Course, CourseStatus } from "@/domain/entities/Course";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";

// ── Input / Output types ───────────────────────────────────────────────────

export interface AdminListCoursesInput {
  search?: string;
  status?: CourseStatus;
  page?: number;
  pageSize?: number;
}

export type AdminListCoursesError = { kind: "db_error"; message: string };

export type AdminListCoursesResult = Result<
  {
    courses: readonly Course[];
    totalCount: number;
    page: number;
    pageSize: number;
  },
  AdminListCoursesError
>;

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface AdminListCoursesDeps {
  courseRepo: CourseRepository;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class AdminListCourses {
  constructor(private readonly deps: AdminListCoursesDeps) {}

  async execute(input: AdminListCoursesInput): Promise<AdminListCoursesResult> {
    // ── 1. Load ────────────────────────────────────────────
    const loadResult = await this.deps.courseRepo.listAll();
    if (!loadResult.ok) {
      return Result.err({
        kind: "db_error",
        message: loadResult.error.kind === "db_error"
          ? loadResult.error.message
          : "Failed to load courses",
      });
    }
    const allCourses = loadResult.value;

    // ── 2. Filter ─────────────────────────────────────────
    const filtered = allCourses.filter((c) => this.matches(c, input));

    // ── 3. Sort by displayOrder, then createdAt ─────────
    const sorted = [...filtered].sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );

    // ── 4. Total + pagination ─────────────────────────────
    const totalCount = sorted.length;
    const page = input.page && input.page >= 1 ? Math.floor(input.page) : DEFAULT_PAGE;
    let pageSize =
      input.pageSize && input.pageSize >= 1 ? Math.floor(input.pageSize) : DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const courses = sorted.slice(start, end);

    // ── 5. Return ─────────────────────────────────────────
    return Result.ok({ courses, totalCount, page, pageSize });
  }

  private matches(course: Course, input: AdminListCoursesInput): boolean {
    if (input.status && course.status !== input.status) return false;
    if (input.search) {
      const q = input.search.toLowerCase();
      const haystack = `${course.title} ${course.slug}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }
}
