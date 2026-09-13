/**
 * /admin/assignments — admin assignment list (P1-02).
 *
 * Server component with search, status filter, and pagination,
 * mirroring `/admin/resources`. Rows resolve student emails and
 * course titles in two batch lookups.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { isAssignmentStatus } from "@/domain/entities/Assignment";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    saved?: string;
    graded?: string;
  }>;
}

function parsePage(v: string | undefined): number {
  if (!v) return 1;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function pageHref(search: string | undefined, status: string, page: number): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return `/admin/assignments?${params.toString()}`;
}

export default async function AssignmentsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const search = params.search?.trim() || undefined;
  const status = params.status && isAssignmentStatus(params.status) ? params.status : "";
  const page = parsePage(params.page);
  const notice =
    params.saved === "1"
      ? "Assignment saved."
      : params.graded === "1"
        ? "Assignment graded."
        : null;

  const container = buildContainer();
  const result = await container.adminListAssignments.execute({
    search,
    status: status === "" ? undefined : status,
    page,
    pageSize: 25,
  });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Assignments" subtitle="Instructor-assigned student work" />
        <Card padding={6}>
          <p className={styles.error}>Assignments could not be loaded. Try again shortly.</p>
        </Card>
      </div>
    );
  }

  const { rows, totalCount, pageSize } = result.value;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const [usersResult, coursesResult] = await Promise.all([
    container.userRepo.findByIds(rows.map((row) => row.userId)),
    container.adminListCourses.execute({ page: 1, pageSize: 100 }),
  ]);
  const emails = new Map(
    (usersResult.ok ? usersResult.value : []).map((user) => [user.id, user.email]),
  );
  const courseTitles = new Map(
    (coursesResult.ok ? coursesResult.value.courses : []).map((course) => [
      course.id,
      course.title,
    ]),
  );

  return (
    <div>
      <TopBar
        title="Assignments"
        subtitle={`${totalCount} total — assigned work, submissions, and grades`}
        actions={
          <Link href="/admin/assignments/new" className={styles.addButton}>
            + Assign work
          </Link>
        }
      />

      {notice && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p className={styles.notice} role="status">
            {notice}
          </p>
        </Card>
      )}

      <form className={styles.filters} method="get" role="search" aria-label="Filter assignments">
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Search</span>
          <input
            type="search"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search titles"
            aria-label="Search titles"
            className={styles.searchInput}
          />
        </label>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Status</span>
          <select name="status" defaultValue={status} className={styles.select}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="GRADED">Graded</option>
          </select>
        </label>
        <button type="submit" className={styles.filterButton}>
          Apply
        </button>
      </form>
      {search && (
        <p className={styles.resultCount} role="status">
          {totalCount} result(s) for &quot;{search}&quot;
        </p>
      )}

      <Card padding={6}>
        {rows.length === 0 ? (
          <p className={styles.empty}>No assignments match these filters.</p>
        ) : (
          <div className="table-scroll">
            <table className={styles.table}>
              <caption className="sr-only">Student assignments</caption>
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Student</th>
                  <th scope="col">Course</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col">Grade</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{emails.get(row.userId) ?? row.userId}</td>
                    <td>{courseTitles.get(row.courseId) ?? row.courseId}</td>
                    <td>{row.dueAt.toLocaleDateString("en-PH")}</td>
                    <td>{row.status}</td>
                    <td>{row.grade === null ? "-" : `${row.grade}/100`}</td>
                    <td>
                      <Link href={`/admin/assignments/${row.id}`} className={styles.rowLink}>
                        {row.status === "SUBMITTED" ? "Grade" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <nav aria-label="Assignment pages" className={styles.pagination}>
          {page > 1 && (
            <Link href={pageHref(search, status, page - 1)} className={styles.pageLink}>
              Previous
            </Link>
          )}
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(search, status, page + 1)} className={styles.pageLink}>
              Next
            </Link>
          )}
        </nav>
      </Card>
    </div>
  );
}
