/**
 * /admin/payments/[id] — admin order detail with refund form.
 *
 * STORY-049. Server component. Includes the ProcessRefund / RefundOverride
 * form (server-action based).
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@/components/ui";
import { formatPhp } from "@/app/admin/_lib/formatPhp";
import { processRefundAction } from "@/app/actions/processRefund.action";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; refundId?: string }>;
}

export default async function AdminPaymentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetPayment.execute({ orderId: id });

  if (!result.ok) {
    if (result.error.kind === "order_not_found") {
      notFound();
    }
    return (
      <div>
        <TopBar title="Error" />
        <Card padding="comfortable">
          <p className={styles.error}>
            Failed to load payment: {result.error.kind}
          </p>
        </Card>
      </div>
    );
  }

  const { order, user, course } = result.value;
  const isPaid = order.status === "PAID";
  const isRefunded = order.status === "REFUNDED";

  async function handleRefund(formData: FormData) {
    "use server";
    const amountMinor = Number(formData.get("amountMinor"));
    const reason = String(formData.get("reason") ?? "").trim();
    const override = formData.get("override") === "on";
    const overrideReason = String(formData.get("overrideReason") ?? "").trim();

    if (!reason) {
      redirect(`/admin/payments/${id}?error=missing_reason`);
    }
    if (override && !overrideReason) {
      redirect(`/admin/payments/${id}?error=missing_override_reason`);
    }
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      redirect(`/admin/payments/${id}?error=invalid_amount`);
    }

    const r = await processRefundAction({
      orderId: id,
      amountMinor,
      reason,
      override,
      overrideReason,
    });
    if (r.ok) {
      redirect(`/admin/payments/${id}?refundId=${encodeURIComponent(r.value.refundId)}`);
    }
    redirect(`/admin/payments/${id}?error=${r.error.kind}`);
  }

  return (
    <div>
      <Link href="/admin/payments" className={styles.backLink}>
        ← Back to payments
      </Link>

      <TopBar
        title={`Order ${order.id}`}
        subtitle={
          <span className={styles.badges}>
            <Badge
              variant={
                order.status === "PAID" ? "accent" :
                order.status === "REFUNDED" ? "neutral" :
                order.status === "PENDING" ? "warning" :
                "danger"
              }
            >
              {order.status}
            </Badge>
          </span>
        }
      />

      {sp.error && (
        <Card padding="comfortable">
          <p className={styles.error}>
            <strong>Error:</strong> {sp.error}
          </p>
        </Card>
      )}

      {sp.refundId && (
        <Card padding="comfortable">
          <p className={styles.success}>
            <strong>Refund issued:</strong> {sp.refundId}
          </p>
        </Card>
      )}

      <div className={styles.grid}>
        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Order</h2>
          <dl className={styles.details}>
            <dt>ID</dt>
            <dd className={styles.mono}>{order.id}</dd>
            <dt>Status</dt>
            <dd>{order.status}</dd>
            <dt>Subtotal</dt>
            <dd className={styles.mono}>{formatPhp(order.subtotalMinor)}</dd>
            <dt>Discount</dt>
            <dd className={styles.mono}>{formatPhp(order.discountMinor)}</dd>
            <dt>Total</dt>
            <dd className={styles.mono}>{formatPhp(order.totalMinor)}</dd>
            <dt>Currency</dt>
            <dd className={styles.mono}>{order.currency}</dd>
            <dt>Created</dt>
            <dd className={styles.mono}>
              {order.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </dd>
            {order.paymongoPaidAt && (
              <>
                <dt>Paid at</dt>
                <dd className={styles.mono}>
                  {order.paymongoPaidAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </dd>
              </>
            )}
            {order.refundProcessedAt && (
              <>
                <dt>Refunded at</dt>
                <dd className={styles.mono}>
                  {order.refundProcessedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </dd>
              </>
            )}
            {order.refundAmountMinor !== null && (
              <>
                <dt>Refund amount</dt>
                <dd className={styles.mono}>{formatPhp(order.refundAmountMinor)}</dd>
              </>
            )}
            {order.refundReason && (
              <>
                <dt>Refund reason</dt>
                <dd>{order.refundReason}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>User</h2>
          <dl className={styles.details}>
            <dt>ID</dt>
            <dd className={styles.mono}>{user.id}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Name</dt>
            <dd>{user.firstName} {user.lastName}</dd>
            <dt>Role</dt>
            <dd>{user.role}</dd>
            <dt>Total XP</dt>
            <dd className={styles.mono}>{user.totalXp}</dd>
          </dl>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Course</h2>
          <dl className={styles.details}>
            <dt>ID</dt>
            <dd className={styles.mono}>{course.id}</dd>
            <dt>Title</dt>
            <dd>{course.title}</dd>
            <dt>Slug</dt>
            <dd className={styles.mono}>{course.slug}</dd>
            <dt>Status</dt>
            <dd>{course.status}</dd>
            <dt>Tier</dt>
            <dd>{course.courseTier}</dd>
            <dt>Price</dt>
            <dd className={styles.mono}>{formatPhp(course.price.minor)}</dd>
          </dl>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>PayMongo</h2>
          <dl className={styles.details}>
            <dt>Payment ID</dt>
            <dd className={styles.mono}>{order.paymongoPaymentId ?? "—"}</dd>
            <dt>Status</dt>
            <dd className={styles.mono}>{order.paymongoStatus ?? "—"}</dd>
            <dt>Checkout URL</dt>
            <dd>
              {order.paymongoCheckoutUrl ? (
                <a href={order.paymongoCheckoutUrl} target="_blank" rel="noopener noreferrer">
                  {order.paymongoCheckoutUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </dl>
        </Card>

        {isPaid && (
          <Card padding="comfortable">
            <h2 className={styles.sectionTitle}>Process refund</h2>
            <form action={handleRefund} className={styles.form}>
              <label className={styles.field}>
                <span className={styles.label}>Amount (minor units / centavos)</span>
                <input
                  type="number"
                  name="amountMinor"
                  required
                  min="1"
                  max={order.totalMinor}
                  defaultValue={order.totalMinor}
                  className={styles.input}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Reason (user-facing)</span>
                <input
                  type="text"
                  name="reason"
                  required
                  maxLength={200}
                  className={styles.input}
                  placeholder="e.g. Customer requested cancellation"
                />
              </label>
              <label className={styles.checkboxField}>
                <input type="checkbox" name="override" />
                <span>Override standard checks (bypasses 30-day window + already-requested)</span>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Override reason (required if checked)</span>
                <input
                  type="text"
                  name="overrideReason"
                  maxLength={200}
                  className={styles.input}
                  placeholder="e.g. Goodwill refund for escalated complaint"
                />
              </label>
              <button type="submit" className={styles.refundButton}>
                Issue refund
              </button>
            </form>
          </Card>
        )}

        {isRefunded && (
          <Card padding="comfortable">
            <h2 className={styles.sectionTitle}>Refund</h2>
            <p className={styles.muted}>
              This order has been refunded. The amount is{" "}
              <strong>{formatPhp(order.refundAmountMinor ?? 0)}</strong>.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
