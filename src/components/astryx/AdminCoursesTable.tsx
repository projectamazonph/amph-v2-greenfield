/**
 * AdminCoursesTable — Astryx Table for /admin/courses.
 *
 * "use client" only because Table's renderCell prop is a function.
 */

"use client";

import Link from "next/link";
import {
  Table,
  type TableColumn,
  type TablePlugin,
  useTablePagination,
  Badge,
} from "@astryxdesign/core";
import type { CourseStatus } from "@/domain/entities/Course";
import { courseLessonCount } from "@/domain/entities/Course";
import { formatPhp } from "@/app/admin/_lib/formatPhp";

// Must satisfy Table's `T extends Record<string, unknown>` constraint.
export interface CourseRow extends Record<string, unknown> {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  priceMinor: number;
  lessonCount: number;
  createdAt: Date;
}

interface AdminCoursesTableProps {
  courses: CourseRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    search?: string;
    status?: CourseStatus;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeVariant(status: CourseStatus) {
  switch (status) {
    case "PUBLISHED":
      return "orange" as const; // AMPH accent = Astryx orange
    case "ARCHIVED":
      return "neutral" as const;
    case "DRAFT":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function buildPageHref(targetPage: number, filters: AdminCoursesTableProps["filters"]) {
  const url = new URL("http://x/admin/courses");
  if (filters.search) url.searchParams.set("search", filters.search);
  if (filters.status) url.searchParams.set("status", filters.status);
  url.searchParams.set("page", String(targetPage));
  return url.pathname + url.search;
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS: TableColumn<CourseRow>[] = [
  {
    key: "title",
    header: "Title",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <Link
        href={`/admin/courses/${row.id}`}
        style={{
          color: "var(--color-text-primary)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        {row.title}
      </Link>
    ),
  },
  {
    key: "slug",
    header: "Slug",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => (
      <code style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.slug}</code>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: { type: "pixel", value: 110 },
    renderCell: (row) => <Badge variant={statusBadgeVariant(row.status)} label={row.status} />,
  },
  {
    key: "price",
    header: "Price",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
        {formatPhp(row.priceMinor)}
      </span>
    ),
  },
  {
    key: "lessons",
    header: "Lessons",
    width: { type: "pixel", value: 80 },
    renderCell: (row) => String(row.lessonCount),
  },
  {
    key: "createdAt",
    header: "Created",
    width: { type: "pixel", value: 130 },
    renderCell: (row) =>
      row.createdAt instanceof Date
        ? row.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : String(row.createdAt),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminCoursesTable({
  courses,
  totalCount,
  page,
  pageSize,
  filters,
}: AdminCoursesTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paginationPlugin = useTablePagination({
    page,
    onPageChange: () => {},
    totalItems: totalCount,
    pageSize,
    variant: "pages",
    position: "below",
    align: "center",
  }) as unknown as TablePlugin<CourseRow>;

  return (
    <>
      <Table
        data={courses}
        columns={COLUMNS}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
        plugins={{ pagination: paginationPlugin }}
      />

      {courses.length === 0 && (
        <p
          style={{
            padding: "var(--spacing-8)",
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          No courses match the current filters.
        </p>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--spacing-6)",
            marginTop: "var(--spacing-6)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Link
            href={buildPageHref(Math.max(1, page - 1), filters)}
            style={{
              color: page > 1 ? "var(--color-accent)" : "var(--color-text-disabled)",
              textDecoration: "none",
              fontWeight: 500,
              cursor: page > 1 ? "pointer" : "default",
            }}
          >
            ← Prev
          </Link>
          <span style={{ fontFamily: "var(--font-family-code)", fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <Link
            href={buildPageHref(Math.min(totalPages, page + 1), filters)}
            style={{
              color: page < totalPages ? "var(--color-accent)" : "var(--color-text-disabled)",
              textDecoration: "none",
              fontWeight: 500,
              cursor: page < totalPages ? "pointer" : "default",
            }}
          >
            Next →
          </Link>
        </nav>
      )}
    </>
  );
}
