/**
 * /admin/payments — admin list of all orders.
 *
 * STORY-049. Server component. Status filter + email search.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";
import { AdminPaymentsTable, type PaymentRow } from "@/components/astryx/AdminPaymentsTable";
import styles from "./page.module.css";

const STATUSES: { value: PaymentStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "EXPIRED", label: "Expired" },
  { value: "REFUNDED", label: "Refunded" },
];

interface PageProps {
  searchParams: Promise<{ status?: string; email?: string }>;
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const status = (params.status || undefined) as PaymentStatus | undefined;
  const email = params.email || undefined;

  const result = await container.adminListPayments.execute({
    status,
    userEmailSearch: email,
  });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Payments" />
        <Card padding="comfortable">
          <p className={styles.error}>Failed to load: {String(result.error.kind)}</p>
        </Card>
      </div>
    );
  }

  const { orders, users } = result.value;

  // Map domain Order[] → PaymentRow[] (plain serializable data for client component)
  const rows: PaymentRow[] = orders.map((o) => ({
    id: o.id,
    userId: o.userId,
    userEmail: users.get(o.userId)?.email ?? o.userId,
    courseId: o.courseId,
    totalMinor: o.totalMinor,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return (
    <div>
      <TopBar
        title="Payments"
        subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
      />

      {/* Filter form — GET submission updates URL params */}
      <form method="get" className={styles.filters}>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={params.status ?? ""} className={styles.select}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>User email</span>
          <input
            type="search"
            name="email"
            placeholder="e.g. alice@example.com"
            defaultValue={params.email ?? ""}
            className={styles.input}
          />
        </label>
        <button type="submit" className={styles.applyButton}>
          Apply
        </button>
        <Link href="/admin/payments" className={styles.clearButton}>
          Clear
        </Link>
      </form>

      {/* Table — client component handles renderCell (function props) */}
      <Card padding="comfortable">
        <AdminPaymentsTable payments={rows} filters={{ status, email }} />
      </Card>
    </div>
  );
}
