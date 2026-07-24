/**
 * AdminRefundsTable — Astryx Table for /admin/refunds.
 *
 * "use client" because renderCell is a function (cannot cross the
 * server/client boundary). All data fetching and filter routing stay
 * server-side in the parent page.
 *
 * The list is read-only here — the row click navigates to the
 * detail page; processing happens on that page.
 */

"use client";

import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";
import { formatPhp } from "@/app/admin/_lib/formatPhp";

// Must satisfy Table's `T extends Record<string, unknown>` constraint.
export interface RefundRequestRow extends Record<string, unknown> {
  id: string;
  userId: string;
  userEmail: string;
  courseId: string;
  totalMinor: number;
  currency: string;
  refundReason: string | null;
  refundRequestedAt: string;
  refundProcessedAt: string | null;
  status: string;
}

interface AdminRefundsTableProps {
  rows: RefundRequestRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(text: string | null, max: number): string {
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS: TableColumn<RefundRequestRow>[] = [
  {
    key: "requestedAt",
    header: "Requested",
    width: { type: "pixel", value: 130 },
    renderCell: (row) => {
      const d = new Date(row.refundRequestedAt);
      return (
        <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
          {d.toLocaleDateString("en-US", { dateStyle: "medium" })}
        </span>
      );
    },
  },
  {
    key: "student",
    header: "Student",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.userEmail}</span>
    ),
  },
  {
    key: "course",
    header: "Course",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.courseId}</span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    width: { type: "pixel", value: 110 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
        {formatPhp(row.totalMinor / 100)}
      </span>
    ),
  },
  {
    key: "reason",
    header: "Reason",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <span
        title={row.refundReason ?? ""}
        style={{
          display: "block",
          maxWidth: 320,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: 12,
          color: row.refundReason ? "var(--text)" : "var(--ink-500)",
        }}
      >
        {truncate(row.refundReason, 80)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: { type: "pixel", value: 110 },
    renderCell: (row) => {
      const processed = row.refundProcessedAt !== null;
      return (
        <Badge
          variant={processed ? "neutral" : "orange"}
          label={processed ? "Processed" : "Pending"}
        />
      );
    },
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 60 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/refunds/${row.id}`}
        style={{
          color: "var(--accent)",
          textDecoration: "none",
          fontWeight: 500,
          fontSize: "var(--font-size-sm)",
        }}
      >
        View
      </Link>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminRefundsTable({ rows }: AdminRefundsTableProps) {
  return (
    <>
      <Table data={rows} columns={COLUMNS} idKey="id" density="compact" dividers="rows" hasHover />

      {rows.length === 0 && (
        <p
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--ink-700)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          No refund requests match the current filters.
        </p>
      )}
    </>
  );
}
