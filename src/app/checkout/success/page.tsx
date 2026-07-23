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

const STYLES: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    background: "var(--surface-0)",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "clamp(24px, 8vw, 40px) clamp(20px, 8vw, 40px) 32px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    textAlign: "center",
    overflowWrap: "anywhere",
  },
  logo: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "var(--accent)",
    textTransform: "uppercase",
  },
  checkmark: {
    width: 64,
    height: 64,
    margin: "0 auto",
    color: "var(--success)",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--ink-900)",
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  body: {
    fontSize: 15,
    color: "var(--ink-500)",
    lineHeight: 1.6,
  },
  cta: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  link: {
    color: "var(--accent)",
    textDecoration: "none",
    fontWeight: 600,
  },
  orderId: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--ink-500)",
    wordBreak: "break-all",
  },
};

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const orderId = searchParams.orderId?.trim() ?? "";
  return (
    <div style={STYLES.page}>
      <div style={STYLES.card}>
        <div style={STYLES.logo}>AMPH</div>
        <svg
          style={STYLES.checkmark}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h1 style={STYLES.title}>Payment received</h1>
        <p style={STYLES.body}>
          Thanks for your purchase. We're confirming your enrollment — it usually takes a few
          seconds. Head to your dashboard to start learning.
        </p>
        <div style={STYLES.cta}>
          <Link
            href="/dashboard"
            className="btn btn-primary"
            style={{ display: "inline-block", padding: "12px 24px" }}
          >
            Go to dashboard
          </Link>
          <Link href="/courses" style={STYLES.link}>
            Back to catalog
          </Link>
        </div>
        {orderId && <p style={STYLES.orderId}>Order reference: {orderId}</p>}
      </div>
    </div>
  );
}
