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
import { Card, Badge } from "@/components/ui";
import { formatPhp } from "@/app/admin/_lib/formatPhp";
import { courseLessonCount } from "@/domain/entities/Course";
import type { CourseStatus } from "@/domain/entities/Course";
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
        <Card padding="comfortable">
          <p className={styles.error}>
            Failed to load courses: {result.error.message}
          </p>
        </Card>
      </div>
    );
  }

  const { courses, totalCount, pageSize } = result.value;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function buildPageHref(targetPage: number): string {
    const url = new URL("http://x/admin/courses");
    if (search) url.searchParams.set("search", search);
    if (status) url.searchParams.set("status", status);
    url.searchParams.set("page", String(targetPage));
    return url.pathname + url.search;
  }

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

      <Card padding="comfortable">
        {courses.length === 0 ? (
          <p className={styles.emptyState}>
            No courses match the current filters.{" "}
            <Link href="/admin/courses/new">Add a course</Link> to get started.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Slug</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Price</th>
                <th className={styles.th}>Lessons</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td className={styles.td}>
                    <Link href={`/admin/courses/${c.id}`} className={styles.courseLink}>
                      {c.title}
                    </Link>
                  </td>
                  <td className={styles.td}>
                    <code className={styles.slug}>{c.slug}</code>
                  </td>
                  <td className={styles.td}>
                    <Badge
                      variant={
                        c.status === "PUBLISHED"
                          ? "accent"
                          : c.status === "ARCHIVED"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className={styles.td}>{formatPhp(c.price.minor)}</td>
                  <td className={styles.td}>{courseLessonCount(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Pagination">
          {page > 1 ? (
            <Link href={buildPageHref(page - 1)} className={styles.pageLink}>
              ← Prev
            </Link>
          ) : (
            <span className={styles.pageLinkDisabled}>← Prev</span>
          )}
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildPageHref(page + 1)} className={styles.pageLink}>
              Next →
            </Link>
          ) : (
            <span className={styles.pageLinkDisabled}>Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
