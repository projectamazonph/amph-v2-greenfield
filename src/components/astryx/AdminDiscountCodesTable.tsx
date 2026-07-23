/**
 * AdminDiscountCodesTable — Astryx Table for /admin/discount-codes.
 *
 * "use client" only because Table's renderCell prop is a function.
 * No pagination — discount codes list is small enough to show all at once.
 */

"use client";

import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";
import type { DiscountType } from "@/domain/entities/DiscountCode";

// Must satisfy Table's `T extends Record<string, unknown>` constraint.
export interface DiscountCodeRow extends Record<string, unknown> {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  maxUses: number | null;
  usedCount: number;
  validUntil: Date | null;
}

interface AdminDiscountCodesTableProps {
  codes: DiscountCodeRow[];
}

function typeBadgeVariant(type: DiscountType) {
  return type === "PERCENTAGE" ? ("blue" as const) : ("purple" as const);
}

function formatValue(type: DiscountType, value: number) {
  return type === "PERCENTAGE" ? `${value}%` : `₱${(value / 100).toFixed(2)}`;
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS: TableColumn<DiscountCodeRow>[] = [
  {
    key: "code",
    header: "Code",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => (
      <code style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.code}</code>
    ),
  },
  {
    key: "type",
    header: "Type",
    width: { type: "pixel", value: 110 },
    renderCell: (row) => <Badge variant={typeBadgeVariant(row.type)} label={row.type} />,
  },
  {
    key: "value",
    header: "Value",
    width: { type: "pixel", value: 90 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
        {formatValue(row.type, row.value)}
      </span>
    ),
  },
  {
    key: "uses",
    header: "Uses",
    width: { type: "pixel", value: 90 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
        {row.maxUses !== null ? `${row.usedCount} / ${row.maxUses}` : `${row.usedCount} / ∞`}
      </span>
    ),
  },
  {
    key: "validUntil",
    header: "Valid until",
    width: { type: "pixel", value: 130 },
    renderCell: (row) =>
      row.validUntil instanceof Date
        ? row.validUntil.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })
        : "Never",
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 60 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/discount-codes/${row.id}/edit`}
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

export function AdminDiscountCodesTable({ codes }: AdminDiscountCodesTableProps) {
  return (
    <>
      <Table data={codes} columns={COLUMNS} idKey="id" density="compact" dividers="rows" hasHover />
      {codes.length === 0 && (
        <p
          style={{
            padding: "var(--spacing-8)",
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          No discount codes yet.
        </p>
      )}
    </>
  );
}
