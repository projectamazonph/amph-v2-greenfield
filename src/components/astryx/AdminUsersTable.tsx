/**
 * AdminUsersTable — Astryx Table for /admin/users.
 *
 * "use client" only because Table's renderCell prop is a function.
 * All data fetching and filter routing stay server-side in the parent page.
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
import type { User } from "@/domain/entities/User";
import type { Role, SubscriptionTier } from "@/domain/entities/User";

// Must satisfy Table's `T extends Record<string, unknown>` constraint.
export interface UserRow extends Record<string, unknown> {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
}

interface AdminUsersTableProps {
  users: UserRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    search?: string;
    role?: Role;
    tier?: SubscriptionTier;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleBadgeVariant(role: Role) {
  switch (role) {
    case "ADMIN":
      return "error" as const;
    case "INSTRUCTOR":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function tierBadgeVariant(tier: SubscriptionTier) {
  switch (tier) {
    case "PRO":
      return "orange" as const; // AMPH accent = Astryx orange
    case "STARTER":
      return "blue" as const;
    default:
      return "neutral" as const;
  }
}

function initials(firstName: string, lastName: string) {
  return `${(firstName[0] ?? "").toUpperCase()}${(lastName[0] ?? "").toUpperCase()}`;
}

function buildPageHref(targetPage: number, filters: AdminUsersTableProps["filters"]) {
  const url = new URL("http://x/admin/users");
  if (filters.search) url.searchParams.set("search", filters.search);
  if (filters.role) url.searchParams.set("role", filters.role);
  if (filters.tier) url.searchParams.set("tier", filters.tier);
  url.searchParams.set("page", String(targetPage));
  return url.pathname + url.search;
}

// ── Column definitions ─────────────────────────────────────────────────────────
// renderCell receives (item: UserRow), not destructured { item }.

const COLUMNS: TableColumn<UserRow>[] = [
  {
    key: "name",
    header: "Name",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <Link
        href={`/admin/users/${row.id}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          textDecoration: "none",
          color: "var(--color-text-primary)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--color-background-muted)",
            color: "var(--color-text-primary)",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-family-code)",
            flexShrink: 0,
          }}
        >
          {initials(row.firstName, row.lastName)}
        </span>
        <span>
          {row.firstName} {row.lastName}
        </span>
      </Link>
    ),
  },
  {
    key: "email",
    header: "Email",
    width: { type: "proportional", value: 2 },
  },
  {
    key: "role",
    header: "Role",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => <Badge variant={roleBadgeVariant(row.role)} label={row.role} />,
  },
  {
    key: "tier",
    header: "Tier",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => (
      <Badge variant={tierBadgeVariant(row.subscriptionTier)} label={row.subscriptionTier} />
    ),
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

export function AdminUsersTable({
  users,
  totalCount,
  page,
  pageSize,
  filters,
}: AdminUsersTableProps) {
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
  }) as unknown as TablePlugin<UserRow>;

  return (
    <>
      <Table
        data={users}
        columns={COLUMNS}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
        plugins={{ pagination: paginationPlugin }}
      />

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
          <span
            style={{
              fontFamily: "var(--font-family-code)",
              fontSize: 13,
            }}
          >
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
