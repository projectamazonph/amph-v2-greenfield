/**
 * /admin/courses — admin courses list.
 *
 * STORY-048a. Server component.
 *
 * Shows all courses in any status (DRAFT, PUBLISHED, ARCHIVED) with
 * search + status filter + pagination. Links to /admin/courses/[id]
 * for detail. "Add course" button links to /admin/courses/new.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { courseLessonCount } from "@/domain/entities/Course";
import type { CourseStatus } from "@/domain/entities/Course";
import { AdminCoursesTable, type CourseRow } from "@/components/astryx/AdminCoursesTable";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

function parseStatus(v: string | undefined): CourseStatus | undefined {
  if (v === "DRAFT" || v === "PUBLISHED" || v === "ARCHIVED") return v;
  return undefined;
}

function parsePage(v: string | undefined): number {
  if (!v) return 1;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function AdminCoursesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search?.trim() || undefined;
  const status = parseStatus(params.status);
  const page = parsePage(params.page);

  const container = buildContainer();
  const result = await container.adminListCourses.execute({
    search,
    status,
    page,
    pageSize: 25,
  });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Courses" subtitle="Manage all courses" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load courses: {result.error.message}</p>
        </Card>
      </div>
    );
  }

  const { courses, totalCount, pageSize } = result.value;

  // Map domain Course[] → CourseRow[] (plain serializable data for client component)
  const rows: CourseRow[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    status: c.status,
    priceMinor: c.price.minor,
    lessonCount: courseLessonCount(c),
    createdAt: c.createdAt,
  }));

  return (
    <div>
      <TopBar
        title="Courses"
        subtitle={`${totalCount} total`}
        actions={
          <Link href="/admin/courses/new" className={styles.addButton}>
            + Add course
          </Link>
        }
      />

      {/* Filter form — GET submission updates URL params */}
      <form className={styles.filters} method="get">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search title or slug"
          className={styles.searchInput}
        />
        <select name="status" defaultValue={status ?? ""} className={styles.select}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="submit" className={styles.filterButton}>
          Apply
        </button>
      </form>

      {/* Table — client component handles renderCell (function props) */}
      <Card padding={6}>
        <AdminCoursesTable
          courses={rows}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          filters={{ search, status }}
        />
      </Card>
    </div>
  );
}
