/**
 * AdminBadgesTable — Astryx Table for /admin/badges.
 *
 * "use client" only because Table's renderCell prop is a function.
 * No pagination — badges list is small enough to show all at once.
 */

"use client";

import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";
import type { Badge as DomainBadge } from "@/domain/entities/Badge";

// Must satisfy Table's `T extends Record<string, unknown>` constraint.
export interface BadgeRow extends Record<string, unknown> {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  xpReward: number;
  archived: boolean;
}

interface AdminBadgesTableProps {
  badges: BadgeRow[];
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS: TableColumn<BadgeRow>[] = [
  {
    key: "slug",
    header: "Slug",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => (
      <code style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.slug}</code>
    ),
  },
  {
    key: "name",
    header: "Name",
    width: { type: "proportional", value: 1 },
  },
  {
    key: "description",
    header: "Description",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <span style={{ color: "var(--ink-700)", fontSize: "var(--font-size-sm)" }}>
        {row.description}
      </span>
    ),
  },
  {
    key: "icon",
    header: "Icon",
    width: { type: "pixel", value: 80 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.iconName}</span>
    ),
  },
  {
    key: "xp",
    header: "XP",
    width: { type: "pixel", value: 60 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>+{row.xpReward}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => (
      <Badge
        variant={row.archived ? "neutral" : "success"}
        label={row.archived ? "Archived" : "Active"}
      />
    ),
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 60 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/badges/${row.slug}/edit`}
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

export function AdminBadgesTable({ badges }: AdminBadgesTableProps) {
  return (
    <>
      <Table
        data={badges}
        columns={COLUMNS}
        idKey="slug"
        density="compact"
        dividers="rows"
        hasHover
      />
      {badges.length === 0 && (
        <p
          style={{
            padding: "var(--spacing-8)",
            textAlign: "center",
            color: "var(--ink-700)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          No badges yet.
        </p>
      )}
    </>
  );
}
