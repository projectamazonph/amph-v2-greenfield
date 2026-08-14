/**
 * AdminResourcesTable — Astryx Table for /admin/resources.
 *
 * "use client" only because Table's renderCell prop is a function.
 * All data fetching and filter routing stay server-side in the parent
 * page. Pagination added in review, mirroring AdminUsersTable.
 */

"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import {
  Table,
  type TableColumn,
  type TablePlugin,
  useTablePagination,
  Badge,
} from "@astryxdesign/core";
import type { ResourceCategory, ResourceFileType } from "@/domain/entities/Resource";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";

export interface ResourceRow extends Record<string, unknown> {
  id: string;
  title: string;
  category: ResourceCategory;
  fileType: ResourceFileType;
  accessTier: CourseAccessTier;
  isPublished: boolean;
  downloadCount: number;
}

interface AdminResourcesTableProps {
  resources: ResourceRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    search?: string;
    category?: ResourceCategory;
    tier?: CourseAccessTier;
  };
}

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  guide: "Guide",
  template: "Template",
  automation_tool: "Automation tool",
  cheat_sheet: "Cheat sheet",
  handout: "Handout",
};

function accessTierBadgeVariant(tier: CourseAccessTier) {
  switch (tier) {
    case "PREVIEW":
      return "neutral" as const;
    case "STARTER":
      return "info" as const;
    case "PRO":
      return "success" as const;
    default:
      return "neutral" as const;
  }
}

function buildPageHref(targetPage: number, filters: AdminResourcesTableProps["filters"]) {
  const url = new URL("http://x/admin/resources");
  if (filters.search) url.searchParams.set("search", filters.search);
  if (filters.category) url.searchParams.set("category", filters.category);
  if (filters.tier) url.searchParams.set("tier", filters.tier);
  url.searchParams.set("page", String(targetPage));
  return url.pathname + url.search;
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS: TableColumn<ResourceRow>[] = [
  {
    key: "title",
    header: "Title",
    width: { type: "proportional", value: 2 },
  },
  {
    key: "category",
    header: "Category",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => CATEGORY_LABELS[row.category],
  },
  {
    key: "fileType",
    header: "Type",
    width: { type: "pixel", value: 80 },
    renderCell: (row) => (
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{row.fileType}</code>
    ),
  },
  {
    key: "accessTier",
    header: "Access",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => (
      <Badge variant={accessTierBadgeVariant(row.accessTier)} label={row.accessTier} />
    ),
  },
  {
    key: "isPublished",
    header: "Status",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => (
      <Badge
        variant={row.isPublished ? "success" : "neutral"}
        label={row.isPublished ? "published" : "unpublished"}
      />
    ),
  },
  {
    key: "downloadCount",
    header: "Downloads",
    width: { type: "pixel", value: 100 },
    align: "end",
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 60 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/resources/${row.id}/edit`}
        style={{
          color: "var(--accent)",
          textDecoration: "none",
          fontWeight: 500,
          fontSize: "var(--font-size-sm)",
        }}
      >
        Edit
      </Link>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminResourcesTable({
  resources,
  totalCount,
  page,
  pageSize,
  filters,
}: AdminResourcesTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paginationPlugin = useTablePagination({
    page,
    onPageChange: () => {
      /* navigation handled by <Link> elements below */
    },
    totalItems: totalCount,
    pageSize,
    variant: "pages",
    position: "below",
    align: "center",
  }) as unknown as TablePlugin<ResourceRow>;

  return (
    <>
      <Table
        data={resources}
        columns={COLUMNS}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
        plugins={{ pagination: paginationPlugin }}
      />
      {resources.length === 0 && (
        <p
          style={{
            padding: "var(--spacing-8)",
            textAlign: "center",
            color: "var(--ink-700)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          No resources found.
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
            color: "var(--ink-700)",
          }}
        >
          <Link
            href={buildPageHref(Math.max(1, page - 1), filters)}
            style={{
              color: page > 1 ? "var(--accent)" : "var(--ink-300)",
              textDecoration: "none",
              fontWeight: 500,
              cursor: page > 1 ? "pointer" : "default",
            }}
          >
            <ArrowLeft size={16} aria-hidden />{" "}Prev
          </Link>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          >
            Page {page} of {totalPages}
          </span>
          <Link
            href={buildPageHref(Math.min(totalPages, page + 1), filters)}
            style={{
              color: page < totalPages ? "var(--accent)" : "var(--ink-300)",
              textDecoration: "none",
              fontWeight: 500,
              cursor: page < totalPages ? "pointer" : "default",
            }}
          >
            Next{" "}<ArrowRight size={16} aria-hidden />
          </Link>
        </nav>
      )}
    </>
  );
}
