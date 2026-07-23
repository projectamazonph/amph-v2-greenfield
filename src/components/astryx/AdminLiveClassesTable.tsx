/**
 * AdminLiveClassesTable — Astryx Table for /admin/live-classes.
 *
 * "use client" only because Table's renderCell prop is a function.
 * No pagination — classes list is small enough to show all at once.
 */

"use client";

import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";
import type { LiveClassStatus } from "@/domain/entities/LiveClass";

// Must satisfy Table's `T extends Record<string, unknown>` constraint.
export interface LiveClassRow extends Record<string, unknown> {
  id: string;
  title: string;
  courseId: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: LiveClassStatus;
}

interface AdminLiveClassesTableProps {
  liveClasses: LiveClassRow[];
}

function statusBadgeVariant(status: LiveClassStatus) {
  switch (status) {
    case "scheduled":
      return "success" as const;
    case "cancelled":
      return "neutral" as const;
    case "completed":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS: TableColumn<LiveClassRow>[] = [
  {
    key: "title",
    header: "Title",
    width: { type: "proportional", value: 2 },
  },
  {
    key: "courseId",
    header: "Course",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => (
      <code style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.courseId}</code>
    ),
  },
  {
    key: "scheduledAt",
    header: "Scheduled",
    width: { type: "pixel", value: 160 },
    renderCell: (row) =>
      row.scheduledAt instanceof Date
        ? row.scheduledAt.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          })
        : String(row.scheduledAt),
  },
  {
    key: "durationMinutes",
    header: "Duration",
    width: { type: "pixel", value: 90 },
    renderCell: (row) => `${row.durationMinutes}m`,
  },
  {
    key: "status",
    header: "Status",
    width: { type: "pixel", value: 110 },
    renderCell: (row) => <Badge variant={statusBadgeVariant(row.status)} label={row.status} />,
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 60 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/live-classes/${row.id}/edit`}
        style={{
          color: "var(--color-accent)",
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

export function AdminLiveClassesTable({ liveClasses }: AdminLiveClassesTableProps) {
  return (
    <>
      <Table
        data={liveClasses}
        columns={COLUMNS}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
      />
      {liveClasses.length === 0 && (
        <p
          style={{
            padding: "var(--spacing-8)",
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          No live classes scheduled yet.
        </p>
      )}
    </>
  );
}
