/**
 * /checkout/success — STORY-021.
 *
 * Lands here after PayMongo completes a checkout. The PayMongo
 * webhook has already (or will shortly) mark the order PAID and
 * enroll the student. This page is a confirmation + a soft
 * "you're in" message with a link to the dashboard.
 *
 * We don't show the order details here (no PII, no card info —
 * PayMongo handles that). Just a thank-you and the next step.
 *
 * Note: the PayMongo redirect can fire BEFORE our webhook has
 * processed. In that case the student sees this page but their
 * dashboard doesn't show the course yet. The webhook is the
 * source of truth; if it's slow, refreshing the dashboard after
 * a few seconds picks up the enrollment. We surface this caveat
 * in the copy.
 */

import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import styles from "../checkout-status.module.css";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId?.trim() ?? "";
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>Project Amazon PH Academy</div>
        <CheckCircle className={styles.checkmark} weight="duotone" aria-hidden="true" />
        <h1 className={styles.title}>Payment received</h1>
        <p className={styles.body}>
          Thanks for your purchase. We're confirming your enrollment — it usually takes a few
          seconds. Head to your dashboard to start learning.
        </p>
        <div className={styles.cta}>
          <Link
            href="/dashboard"
            className="btn btn-primary"
            style={{ display: "inline-block", padding: "12px 24px" }}
          >
            Go to dashboard
          </Link>
          <Link href="/courses" className={styles.link}>
            Back to catalog
          </Link>
        </div>
        {orderId && <p className={styles.orderId}>Order reference: {orderId}</p>}
      </div>
    </div>
  );
}
