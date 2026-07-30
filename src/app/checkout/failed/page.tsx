/**
 * /checkout/failed — STORY-021.
 *
 * Lands here when PayMongo's hosted checkout returns the user with
 * `failed_url` (payment declined, user closed the page mid-flow, or
 * the session expired). The order stays in PENDING state; the
 * student can retry by going back to /checkout?courseSlug=...
 *
 * We deliberately don't delete the order — keeping the PENDING
 * record lets the student resume if they close the tab and come
 * back, and gives support a paper trail if a refund is later
 * needed.
 */

import Link from "next/link";
import { XCircle } from "@phosphor-icons/react/dist/ssr";
import styles from "../checkout-status.module.css";

export default function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: { orderId?: string; courseSlug?: string };
}) {
  const orderId = searchParams.orderId?.trim() ?? "";
  const courseSlug = searchParams.courseSlug?.trim() ?? "";
  // If we know the slug, deep-link back to /checkout for retry.
  const retryHref = courseSlug
    ? `/checkout?courseSlug=${encodeURIComponent(courseSlug)}`
    : "/courses";
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>Project Amazon PH Academy</div>
        <XCircle className={styles.checkmark} weight="duotone" style={{ color: "var(--danger)" }} aria-hidden="true" />
        <h1 className={styles.title}>Payment not completed</h1>
        <p className={styles.body}>
          Your payment was cancelled or didn't go through. You haven't been charged. Try again
          whenever you're ready — your spot in the catalog is still open.
        </p>
        <div className={styles.cta}>
          <Link
            href={retryHref}
            className="btn btn-primary"
            style={{ display: "inline-block", padding: "12px 24px" }}
          >
            Try again
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
