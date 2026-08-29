import Link from "next/link";
import { redirect } from "next/navigation";
import { requestRefundAction } from "@/app/actions/requestRefund.action";
import { StudentShell } from "@/components/student/StudentShell";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import styles from "../profile-subpage.module.css";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ refundRequested?: string; refundError?: string }>;
}

const refundErrors: Record<string, string> = {
  invalid_reason: "Add a reason between 10 and 500 characters.",
  order_not_found: "That purchase could not be found.",
  order_not_paid: "Only paid purchases can be refunded.",
  refund_window_expired: "The seven-day refund window has ended.",
  completion_limit_reached: "Refunds are unavailable after reaching 25% course completion.",
  db_error: "We could not submit the request. Please try again.",
};

export default async function PurchasesPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=%2Fprofile%2Fpurchases");
  const params = await searchParams;
  const container = buildContainer();
  const ordersResult = await container.orderRepo.findByUserId(user.id);
  if (!ordersResult.ok) {
    // Use empty array as fallback
    const orders = [];
  const orders = ordersResult.ok ? [...ordersResult.value].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const [courseResults, enrollments] = await Promise.all([
    Promise.all(orders.map((order) => container.courseRepo.findById(order.courseId))),
    Promise.all(
      orders.map((order) =>
        container.enrollmentRepo.findByUserIdAndCourseId(user.id, order.courseId),
      ),
    ),
  ]);

  return (
    <StudentShell user={user}>
      <main
        id="main-content"
        tabIndex={-1}
        className={styles.page}
        aria-labelledby="purchases-title"
      >
        <Link href="/profile" className={styles.backLink}>
          ← Back to profile
        </Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Account settings</span>
          <h1 id="purchases-title" className={styles.title}>
            Purchases and refunds
          </h1>
          <p className={styles.intro}>
            Review payment status, course completion, and whether a recent purchase is eligible for a
            refund request.
          </p>
        </header>

        {params.refundRequested === "1" ? (
          <p className={styles.notice} role="status">
            Refund request submitted. An administrator will review it.
          </p>
        ) : null}
        {params.refundError ? (
          <p className={styles.error} role="alert">
            {refundErrors[params.refundError] ?? refundErrors.db_error}
          </p>
        ) : null}

        {orders.length === 0 ? (
          <section className={styles.section} aria-labelledby="no-purchases-title">
            <p className={styles.sectionKicker}>Purchase history</p>
            <h2 id="no-purchases-title" className={styles.sectionTitle}>
              No purchases yet
            </h2>
            <p className={styles.empty}>
              Your paid course enrollments will appear here with payment and refund details.
            </p>
            <div className={styles.actions}>
              <Link href="/courses" className={styles.primary}>
                Browse courses
              </Link>
            </div>
          </section>
        ) : (
          <div className={styles.grid}>
            {orders.map((order, index) => {

              if (!order) return null;
              const courseResult = courseResults[index];
              if (!courseResult?.ok && courseResult?.error.kind === "db_error") {
        // Skip this order
        return null;
              }
              const courseTitle = courseResult?.ok ? courseResult.value.title : "Course purchase";
              const enrollment = enrollments[index];
              const paidAt = order.paymongoPaidAt ?? order.createdAt;
              const withinWindow = Boolean(
                order.paymongoPaidAt &&
                  Date.now() - order.paymongoPaidAt.getTime() <= 7 * 24 * 60 * 60 * 1000,
              );
              const underCompletionLimit = (enrollment?.progressPercent ?? 0) < 25;
              const canRequest =
                order.status === "PAID" &&
                order.refundRequestedAt === null &&
                withinWindow &&
                underCompletionLimit;
              const titleId = `purchase-${order.id}-title`;

              return (
                <section key={order.id} className={styles.section} aria-labelledby={titleId}>
                  <p className={styles.sectionKicker}>Purchase record</p>
                  <h2 id={titleId} className={styles.sectionTitle}>
                    {courseTitle}
                  </h2>
                  <dl className={styles.fields}>
                    <Field label="Status" value={order.status} />
                    <Field label="Total" value={formatMoney(order.totalMinor, order.currency)} />
                    <Field
                      label="Purchased"
                      value={
                        <time dateTime={paidAt.toISOString()}>
                          {paidAt.toISOString().slice(0, 10)}
                        </time>
                      }
                    />
                    <Field
                      label="Course completion"
                      value={`${enrollment?.progressPercent ?? 0}%`}
                    />
                  </dl>

                  {order.refundRequestedAt ? (
                    <p className={styles.empty} role="status">
                      {order.refundProcessedAt
                        ? "Refund processed."
                        : `Refund requested on ${order.refundRequestedAt.toISOString().slice(0, 10)}.`}
                    </p>
                  ) : canRequest ? (
                    <form action={requestRefundAction} className={styles.fields}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <label className={styles.field} htmlFor={`refund-reason-${order.id}`}>
                        <span className={styles.fieldLabel}>Why are you requesting a refund?</span>
                        <textarea
                          id={`refund-reason-${order.id}`}
                          name="reason"
                          minLength={10}
                          maxLength={500}
                          required
                          rows={4}
                          className={styles.textarea}
                          aria-describedby={`refund-hint-${order.id}`}
                        />
                        <span id={`refund-hint-${order.id}`} className={styles.hint}>
                          Use 10–500 characters. Refund requests must be submitted within seven days
                          and before 25% course completion.
                        </span>
                      </label>
                      <button type="submit" className={styles.secondary}>
                        Request refund
                      </button>
                    </form>
                  ) : order.status === "PAID" ? (
                    <p className={styles.empty}>
                      Refund requests require less than 25% completion and must be made within seven
                      days of payment.
                    </p>
                  ) : null}
                </section>
              );
            }).filter(Boolean)
          </div>
        )}
      </main>
    </StudentShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={styles.fieldValue}>{value}</dd>
    </div>
  );
}

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(minor / 100);
}
