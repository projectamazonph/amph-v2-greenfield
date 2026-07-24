/**
 * /admin/refunds — paginated list of student-initiated refund requests.
 *
 * STORY-062. Server component. URL search params control the active
 * tab (pending/processed), the email filter, and the cursor for
 * pagination. All data is loaded server-side via the composition
 * container.
 *
 * Page structure:
 *  - TopBar: "Refund Requests" + total count
 *  - Tab toggle: Pending | Processed
 *  - Filter row: email search
 *  - Table: Requested date, Student email, Course, Amount, Reason,
 *           Status badge, View link
 *  - Cursor-based pagination
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { AdminRefundsTable, type RefundRequestRow } from "@/components/astryx/AdminRefundsTable";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    email?: string;
    cursor?: string;
  }>;
}

function buildFilterParams(
  current: { status?: string; email?: string; cursor?: string },
  updates: { status?: string; email?: string; cursor?: string },
): string {
  const merged = { ...current, ...updates };
  const params = new URLSearchParams();
  if (merged.status && merged.status !== "pending") {
    params.set("status", merged.status);
  }
  if (merged.email) params.set("email", merged.email);
  if (merged.cursor) params.set("cursor", merged.cursor);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default async function AdminRefundsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await requireAdmin();

  const container = buildContainer();

  // Default tab is "pending" — that's the work queue admins care about.
  const status: "pending" | "processed" = params.status === "processed" ? "processed" : "pending";
  const email = params.email || undefined;
  const cursor = params.cursor || undefined;

  const result = await container.listRefundRequests.execute({
    status,
    userEmailSearch: email,
    cursor,
    limit: 25,
  });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Refund Requests" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load: {String(result.error.kind)}</p>
        </Card>
      </div>
    );
  }

  const { orders, users, nextCursor, total } = result.value;

  // Map domain Order[] → RefundRequestRow[] (plain serializable data
  // for the client component).
  const rows: RefundRequestRow[] = orders.map((o) => ({
    id: o.id,
    userId: o.userId,
    userEmail: users.get(o.userId)?.email ?? o.userId,
    courseId: o.courseId,
    totalMinor: o.totalMinor,
    currency: o.currency,
    refundReason: o.refundReason,
    refundRequestedAt: o.refundRequestedAt
      ? o.refundRequestedAt.toISOString()
      : new Date(0).toISOString(),
    refundProcessedAt: o.refundProcessedAt ? o.refundProcessedAt.toISOString() : null,
    status: o.status,
  }));

  const filterParams = {
    status: params.status ?? "pending",
    email: params.email ?? "",
    cursor: params.cursor ?? "",
  };

  const nextLink = nextCursor
    ? `/admin/refunds${buildFilterParams(filterParams, { cursor: nextCursor })}`
    : null;

  // Total tab counts (cheap: re-run the same query with the other
  // status filter). This avoids surprising the admin by showing
  // e.g. "23 refund requests" but only 5 pending rows.
  const totalPendingRes = await container.listRefundRequests.execute({
    status: "pending",
    userEmailSearch: email,
    limit: 1,
  });
  const totalProcessedRes = await container.listRefundRequests.execute({
    status: "processed",
    userEmailSearch: email,
    limit: 1,
  });

  const totalPending = totalPendingRes.ok ? totalPendingRes.value.total : null;
  const totalProcessed = totalProcessedRes.ok ? totalProcessedRes.value.total : null;

  return (
    <div>
      <TopBar
        title="Refund Requests"
        subtitle={`${total.toLocaleString()} ${status} request${total === 1 ? "" : "s"}`}
      />

      <nav className={styles.tabs} aria-label="Refund status">
        <Link
          href={`/admin/refunds${buildFilterParams(filterParams, { status: "pending", cursor: "" })}`}
          className={[styles.tab, status === "pending" ? styles.tabActive : ""]
            .filter(Boolean)
            .join(" ")}
          aria-current={status === "pending" ? "page" : undefined}
        >
          Pending{totalPending !== null ? ` (${totalPending.toLocaleString()})` : ""}
        </Link>
        <Link
          href={`/admin/refunds${buildFilterParams(filterParams, { status: "processed", cursor: "" })}`}
          className={[styles.tab, status === "processed" ? styles.tabActive : ""]
            .filter(Boolean)
            .join(" ")}
          aria-current={status === "processed" ? "page" : undefined}
        >
          Processed{totalProcessed !== null ? ` (${totalProcessed.toLocaleString()})` : ""}
        </Link>
      </nav>

      <form method="get" className={styles.filters}>
        <input type="hidden" name="status" value={status} />
        <label className={styles.searchLabel}>
          <span>Student email</span>
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
        <Link
          href={`/admin/refunds${buildFilterParams({ ...filterParams, email: "" }, { cursor: "" })}`}
          className={styles.clearButton}
        >
          Clear
        </Link>
      </form>

      <Card padding={0}>
        <AdminRefundsTable rows={rows} />

        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            {total.toLocaleString()} total {status} request{total === 1 ? "" : "s"}
          </span>
          {nextLink !== null ? (
            <Link href={nextLink} className={styles.nextButton}>
              Next →
            </Link>
          ) : (
            <span className={styles.nextButtonDisabled}>Next →</span>
          )}
        </div>
      </Card>
    </div>
  );
}
