/**
 * AdminPaymentsTable — Astryx Table for /admin/payments.
 *
 * "use client" only because Table's renderCell prop is a function.
 * All data fetching and filter routing stay server-side in the parent page.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  type TableColumn,
  type TablePlugin,
  useTablePagination,
  Badge,
} from "@astryxdesign/core";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";
import { formatPhp } from "@/app/admin/_lib/formatPhp";

// Must satisfy Table's `T extends Record<string, unknown>` constraint.
export interface PaymentRow extends Record<string, unknown> {
  id: string;
  userId: string;
  userEmail: string;
  courseId: string;
  totalMinor: number;
  status: PaymentStatus;
  createdAt: Date;
}

interface AdminPaymentsTableProps {
  payments: PaymentRow[];
  filters: {
    status?: PaymentStatus;
    email?: string;
  };
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeVariant(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "orange" as const; // AMPH accent = Astryx orange
    case "REFUNDED":
      return "neutral" as const;
    case "PENDING":
      return "warning" as const;
    case "DRAFT":
      return "neutral" as const;
    case "FAILED":
    case "EXPIRED":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

// ── Column definitions ─────────────────────────────────────────────────────────
// renderCell receives (item: PaymentRow), not destructured { item }.

const COLUMNS: TableColumn<PaymentRow>[] = [
  {
    key: "id",
    header: "ID",
    width: { type: "proportional", value: 1 },
  },
  {
    key: "user",
    header: "User",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{row.userEmail}</span>
    ),
  },
  {
    key: "course",
    header: "Course",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{row.courseId}</span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
        {formatPhp(row.totalMinor)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => <Badge variant={statusBadgeVariant(row.status)} label={row.status} />,
  },
  {
    key: "createdAt",
    header: "Created",
    width: { type: "pixel", value: 130 },
    renderCell: (row) =>
      row.createdAt instanceof Date
        ? row.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })
        : String(row.createdAt),
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 60 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/payments/${row.id}`}
        style={{
          color: "var(--accent)",
          textDecoration: "none",
          fontWeight: 500,
          fontSize: "var(--text-sm)",
        }}
      >
        View
      </Link>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminPaymentsTable({ payments, filters, pagination }: AdminPaymentsTableProps) {
  const router = useRouter();

  function buildPageUrl(newPage: number) {
    const p = new URLSearchParams();
    if (filters.status) p.set("status", filters.status);
    if (filters.email) p.set("email", filters.email);
    if (newPage > 1) p.set("page", String(newPage));
    return `/admin/payments?${p.toString()}`;
  }

  function handlePageChange(newPage: number) {
    router.push(buildPageUrl(newPage));
  }

  const paginationPlugin = useTablePagination({
    page: pagination.page,
    onPageChange: handlePageChange,
    totalItems: pagination.total,
    pageSize: pagination.pageSize,
    variant: "pages",
    position: "below",
    align: "center",
  }) as unknown as TablePlugin<PaymentRow>;

  return (
    // L11 fix: <figcaption> provides WCAG 1.3.1 accessible name for the table.
    <figure style={{ margin: 0 }}>
      <figcaption className="sr-only">Payment orders</figcaption>
      <Table
        data={payments}
        columns={COLUMNS}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
        plugins={{ pagination: paginationPlugin }}
      />

      {payments.length === 0 && (
        <p
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--ink-700)",
            fontSize: "var(--text-sm)",
          }}
        >
          No orders match the current filters.
        </p>
      )}
    </figure>
  );
}
