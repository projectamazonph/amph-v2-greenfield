/**
 * /admin/payments — admin list of all orders.
 *
 * STORY-049. Server component. Status filter + email search.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@/components/ui";
import { formatPhp } from "@/app/admin/_lib/formatPhp";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";
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

  return (
    <div>
      <TopBar
        title="Payments"
        subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
      />

      <form method="get" className={styles.filters}>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={params.status ?? ""} className={styles.select}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
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
        <button type="submit" className={styles.applyButton}>Apply</button>
        <Link href="/admin/payments" className={styles.clearButton}>Clear</Link>
      </form>

      <Card padding="comfortable">
        {orders.length === 0 ? (
          <p className={styles.muted}>No orders match the current filters.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const u = users.get(o.userId);
                return (
                  <tr key={o.id}>
                    <td className={styles.mono}>{o.id}</td>
                    <td>{u ? u.email : o.userId}</td>
                    <td className={styles.mono}>{o.courseId}</td>
                    <td className={styles.mono}>{formatPhp(o.totalMinor)}</td>
                    <td>
                      <Badge
                        variant={
                          o.status === "PAID" ? "accent" :
                          o.status === "REFUNDED" ? "neutral" :
                          o.status === "PENDING" ? "warning" :
                          o.status === "FAILED" || o.status === "EXPIRED" ? "danger" :
                          "neutral"
                        }
                      >
                        {o.status}
                      </Badge>
                    </td>
                    <td className={styles.mono}>
                      {o.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </td>
                    <td>
                      <Link href={`/admin/payments/${o.id}`} className={styles.viewButton}>
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
