/**
 * /admin/refunds/[orderId] — refund request detail + process form.
 *
 * STORY-062. Server component. Renders the order, the user, the
 * course, the refund-request context, and (for pending requests)
 * a "Process Refund" form that calls processRefundRequestAction.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@astryxdesign/core";
import { formatPhp } from "@/app/admin/_lib/formatPhp";
import { processRefundRequestAction } from "@/app/actions/processRefundRequest.action";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ error?: string; refundId?: string }>;
}

export default async function AdminRefundDetailPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetPayment.execute({ orderId });

  if (!result.ok) {
    if (result.error.kind === "order_not_found") {
      notFound();
    }
    return (
      <div>
        <TopBar title="Error" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load refund request: {String(result.error.kind)}</p>
        </Card>
      </div>
    );
  }

  const { order, user, course } = result.value;

  const isPending = order.refundRequestedAt !== null && order.refundProcessedAt === null;
  const isProcessed = order.refundProcessedAt !== null;

  async function handleProcessRefund() {
    "use server";
    const r = await processRefundRequestAction({ orderId });
    if (r.ok) {
      redirect(`/admin/refunds/${orderId}?refundId=${encodeURIComponent(r.value.refundId)}`);
    }
    redirect(`/admin/refunds/${orderId}?error=${r.error.kind}`);
  }

  return (
    <div>
      <Link href="/admin/refunds" className={styles.backLink}>
        ← Back to refund requests
      </Link>

      <TopBar
        title={`Refund · ${order.id}`}
        subtitle={
          <span className={styles.badges}>
            <Badge
              variant={isProcessed ? "neutral" : "orange"}
              label={isProcessed ? "Processed" : "Pending"}
            />
            <Badge
              variant={
                order.status === "PAID"
                  ? "orange"
                  : order.status === "REFUNDED"
                    ? "neutral"
                    : "error"
              }
              label={order.status}
            />
          </span>
        }
      />

      {sp.error && (
        <Card padding={6}>
          <p className={styles.error}>
            <strong>Error:</strong> {sp.error}
          </p>
        </Card>
      )}

      {sp.refundId && (
        <Card padding={6}>
          <p className={styles.success}>
            <strong>Refund issued:</strong> {sp.refundId}
          </p>
        </Card>
      )}

      <div className={styles.grid}>
        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Refund request</h2>
          <dl className={styles.details}>
            <dt>Requested at</dt>
            <dd className={styles.mono}>
              {order.refundRequestedAt
                ? order.refundRequestedAt.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </dd>
            <dt>Student reason</dt>
            <dd>{order.refundReason ?? <span className={styles.muted}>(none provided)</span>}</dd>
            {isProcessed && (
              <>
                <dt>Processed at</dt>
                <dd className={styles.mono}>
                  {order.refundProcessedAt?.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
                <dt>Refund amount</dt>
                <dd className={styles.mono}>
                  {order.refundAmountMinor !== null
                    ? formatPhp(order.refundAmountMinor / 100)
                    : "—"}
                </dd>
              </>
            )}
            <dt>Order status</dt>
            <dd>{order.status}</dd>
          </dl>
        </Card>

        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Student</h2>
          <dl className={styles.details}>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Name</dt>
            <dd>
              {user.firstName} {user.lastName}
            </dd>
            <dt>User ID</dt>
            <dd className={styles.mono}>{user.id}</dd>
          </dl>
        </Card>

        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Order</h2>
          <dl className={styles.details}>
            <dt>ID</dt>
            <dd className={styles.mono}>{order.id}</dd>
            <dt>Total</dt>
            <dd className={styles.mono}>{formatPhp(order.totalMinor / 100)}</dd>
            <dt>Currency</dt>
            <dd className={styles.mono}>{order.currency}</dd>
            {order.paymongoPaidAt && (
              <>
                <dt>Paid at</dt>
                <dd className={styles.mono}>
                  {order.paymongoPaidAt.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </>
            )}
            {order.paymongoPaymentId && (
              <>
                <dt>PayMongo ID</dt>
                <dd className={styles.mono}>{order.paymongoPaymentId}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Course</h2>
          <dl className={styles.details}>
            <dt>Title</dt>
            <dd>{course.title}</dd>
            <dt>Slug</dt>
            <dd className={styles.mono}>{course.slug}</dd>
            <dt>Course ID</dt>
            <dd className={styles.mono}>{course.id}</dd>
          </dl>
        </Card>

        {isPending && (
          <Card padding={6} className={styles.fullSpan}>
            <h2 className={styles.sectionTitle}>Process refund</h2>
            <p className={styles.muted}>
              This will issue a full refund of {formatPhp(order.totalMinor / 100)} to the student
              via PayMongo and mark the order as refunded. The student will see the refund on their
              original payment method within 5–10 business days.
            </p>
            <form action={handleProcessRefund} className={styles.form}>
              <button type="submit" className={styles.refundButton}>
                Process refund — {formatPhp(order.totalMinor / 100)}
              </button>
            </form>
          </Card>
        )}

        {isProcessed && (
          <Card padding={6} className={styles.fullSpan}>
            <h2 className={styles.sectionTitle}>Refund</h2>
            <p className={styles.muted}>
              This order was refunded on{" "}
              {order.refundProcessedAt?.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              for{" "}
              <strong>
                {order.refundAmountMinor !== null ? formatPhp(order.refundAmountMinor / 100) : "—"}
              </strong>
              .
            </p>
          </Card>
        )}

        <div className={styles.fullSpan}>
          <Link href={`/admin/payments/${order.id}`} className={styles.viewOrderLink}>
            View full order →
          </Link>
        </div>
      </div>
    </div>
  );
}
