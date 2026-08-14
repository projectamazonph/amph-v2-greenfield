/**
 * /admin/payments — admin list of all orders.
 *
 * STORY-049. Server component. Status filter + email search.
 */

import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { PaymentFilters, STATUSES } from "./PaymentFilters";
import { AdminPaymentsTable, type PaymentRow } from "@/components/astryx/AdminPaymentsTable";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{ status?: string; email?: string; page?: string }>;
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const selectedStatus = STATUSES.find((entry) => entry.value === params.status)?.value;
  const status = selectedStatus || undefined;
  const email = params.email || undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const result = await container.adminListPayments.execute({
    status,
    userEmailSearch: email,
    page,
    pageSize: 25,
  });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Payments" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load: {String(result.error.kind)}</p>
        </Card>
      </div>
    );
  }

  const { orders, users, total, page: currentPage, pageSize } = result.value;

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
        subtitle={`${total} order${total === 1 ? "" : "s"}`}
      />

      <PaymentFilters defaultStatus={params.status ?? ""} defaultEmail={params.email ?? ""} />

      {/* Table — client component handles renderCell (function props) */}
      <Card padding={6}>
        <AdminPaymentsTable
          payments={rows}
          filters={{ status, email }}
          pagination={{ total, page: currentPage, pageSize }}
        />
      </Card>
    </div>
  );
}
