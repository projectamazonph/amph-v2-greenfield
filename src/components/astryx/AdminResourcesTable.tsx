/**
 * AdminResourcesTable — Astryx Table for /admin/resources.
 *
 * "use client" only because Table's renderCell prop is a function.
 * No pagination — the download-center catalog is small enough to
 * show all at once.
 */

"use client";

import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";
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
      <code style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.fileType}</code>
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

export function AdminResourcesTable({ resources }: AdminResourcesTableProps) {
  return (
    <>
      <Table
        data={resources}
        columns={COLUMNS}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
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
          No resources yet.
        </p>
      )}
    </>
  );
}
