import { redirect } from "next/navigation";
import { requestRefundAction } from "@/app/actions/requestRefund.action";
import { StudentShell } from "@/components/student/StudentShell";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import styles from "../page.module.css";

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
  if (!ordersResult.ok) throw new Error("Failed to load purchases");
  const orders = [...ordersResult.value].sort(
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
      <main className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Purchases and refunds</h1>
          <p className={styles.email}>Review payment status and request eligible refunds.</p>
        </header>

        {params.refundRequested === "1" ? (
          <div className="alert alert-success" role="status">
            Refund request submitted. An administrator will review it.
          </div>
        ) : null}
        {params.refundError ? (
          <div className="alert alert-error" role="alert">
            {refundErrors[params.refundError] ?? refundErrors.db_error}
          </div>
        ) : null}

        {orders.length === 0 ? (
          <p className={styles.empty}>No purchases yet.</p>
        ) : (
          <div className={styles.grid}>
            {orders.map((order, index) => {
              const courseResult = courseResults[index];
              if (!courseResult?.ok && courseResult?.error.kind === "db_error") {
                throw new Error("Failed to load purchase course");
              }
              const courseTitle = courseResult?.ok ? courseResult.value.title : "Course purchase";
              const enrollment = enrollments[index];
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

              return (
                <section key={order.id} className={styles.section}>
                  <h2 className={styles.sectionTitle}>{courseTitle}</h2>
                  <dl className={styles.fields}>
                    <Field label="Status" value={order.status} />
                    <Field label="Total" value={formatMoney(order.totalMinor, order.currency)} />
                    <Field
                      label="Purchased"
                      value={(order.paymongoPaidAt ?? order.createdAt).toISOString().slice(0, 10)}
                    />
                    <Field
                      label="Course completion"
                      value={`${enrollment?.progressPercent ?? 0}%`}
                    />
                  </dl>

                  {order.refundRequestedAt ? (
                    <p className={styles.empty}>
                      {order.refundProcessedAt
                        ? "Refund processed."
                        : `Refund requested on ${order.refundRequestedAt.toISOString().slice(0, 10)}.`}
                    </p>
                  ) : canRequest ? (
                    <form action={requestRefundAction} className={styles.fields}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <label className={styles.fieldLabel} htmlFor={`refund-reason-${order.id}`}>
                        Why are you requesting a refund?
                      </label>
                      <textarea
                        id={`refund-reason-${order.id}`}
                        name="reason"
                        minLength={10}
                        maxLength={500}
                        required
                        rows={4}
                      />
                      <button type="submit" className="btn btn-secondary">
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
            })}
          </div>
        )}
      </main>
    </StudentShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
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
