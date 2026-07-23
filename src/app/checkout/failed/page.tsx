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
    <div style={STYLES.page}>
      <div style={STYLES.card}>
        <div style={STYLES.logo}>Project Amazon PH Academy</div>
        <h1 style={STYLES.title}>Payment not completed</h1>
        <p style={STYLES.body}>
          Your payment was cancelled or didn't go through. You haven't been charged. Try again
          whenever you're ready — your spot in the catalog is still open.
        </p>
        <div style={STYLES.cta}>
          <Link
            href={retryHref}
            className="btn btn-primary"
            style={{ display: "inline-block", padding: "12px 24px" }}
          >
            Try again
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
