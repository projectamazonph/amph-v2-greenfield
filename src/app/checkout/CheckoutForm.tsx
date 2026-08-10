/**
 * /checkout — STORY-021.
 *
 * The student-facing entry point for PayMongo checkout. Receives a
 * `?courseSlug=...` query param (the EnrollButton on /courses/[slug]
 * links here with the slug), shows an order-summary card, and on
 * submit calls the startCheckout server action which redirects to
 * the PayMongo hosted checkout URL.
 *
 * Flow:
 *   1. Student clicks "Buy now" on /courses/[slug]
 *   2. EnrollButton navigates to /checkout?courseSlug=...
 *   3. /checkout shows the order summary + "Pay with PayMongo" button
 *   4. The action calls CreatePaymentIntent → returns checkout URL
 *   5. Client-side `redirect()` to the PayMongo URL
 *   6. PayMongo collects payment → webhook → student is enrolled
 *   7. Student lands on /checkout/success?orderId=... or /checkout/failed?orderId=...
 *
 * Why a separate "review then pay" step instead of immediately
 * redirecting? Two reasons:
 *  - Honesty: the student sees the price + course title before they
 *    leave the site. Auto-redirect on click would feel like a bait-
 *    and-switch if the price wasn't what they expected.
 *  - Recoverability: if CreatePaymentIntent fails (e.g. PayMongo
 *    down), the student sees an error on our domain, not a PayMongo
 *    error page they can't navigate away from.
 *
 * The page is a client component because it uses useActionState
 * (React 19's useFormState successor) for the form state. The server
 * work is delegated to the startCheckout server action.
 *
 * No Tailwind. Field Manual design system tokens.
 */

"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import {
  startCheckout,
  CHECKOUT_INITIAL_STATE,
  type CheckoutActionState,
} from "@/app/actions/checkout.action";
import type { CheckoutSummary } from "@/usecases/GetCheckoutSummary";

const PAGE_STYLES: Record<string, React.CSSProperties> = {
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
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
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
  subtitle: {
    fontSize: 15,
    color: "var(--ink-500)",
    lineHeight: 1.5,
  },
  summary: {
    borderTop: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)",
    padding: "16px 0",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 4,
    fontSize: 14,
  },
  summaryTotal: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 4,
    fontSize: 18,
    fontWeight: 700,
    marginTop: 8,
  },
  alert: {
    padding: "12px 16px",
    borderRadius: "var(--radius)",
    fontSize: 14,
    border: "1px solid",
  },
  alertError: {
    background: "var(--danger-soft)",
    color: "var(--danger)",
    borderColor: "#FECACA",
  },
  alertInfo: {
    background: "var(--accent-soft)",
    color: "var(--ink-900)",
    borderColor: "var(--accent)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  hint: {
    fontSize: 13,
    color: "var(--ink-500)",
    lineHeight: 1.5,
  },
  footer: {
    textAlign: "center",
    fontSize: 14,
    color: "var(--ink-500)",
  },
  link: {
    color: "var(--accent)",
    textDecoration: "none",
    fontWeight: 600,
  },
};

interface CheckoutFormProps {
  offer: { courseSlug: string } | { pricingTierSlug: string } | null;
  summary: CheckoutSummary | null;
  loadError:
    | "missing_offer"
    | "course_not_found"
    | "course_not_published"
    | "pricing_tier_not_found"
    | "pricing_tier_unavailable"
    | null;
}

export default function CheckoutForm({ offer, summary, loadError }: CheckoutFormProps) {
  const [state, formAction, isPending] = useActionState<CheckoutActionState, FormData>(
    startCheckout,
    CHECKOUT_INITIAL_STATE,
  );

  // When the action returns a redirect, navigate to PayMongo.
  useEffect(() => {
    if (state.kind === "redirect") {
      // Use a hard navigation so PayMongo's redirect chain works
      // cleanly without any client-side routing interference.
      window.location.href = state.checkoutUrl;
    }
  }, [state]);

  if (!offer || !summary) {
    return (
      <div style={PAGE_STYLES.page}>
        <div style={PAGE_STYLES.card}>
          <div style={PAGE_STYLES.header}>
            <div style={PAGE_STYLES.logo}>Project Amazon PH Academy</div>
            <h1 style={PAGE_STYLES.title}>Checkout</h1>
          </div>
          <div style={{ ...PAGE_STYLES.alert, ...PAGE_STYLES.alertError }} role="alert">
            {checkoutLoadErrorMessage(loadError)} Pick a course from the{" "}
            <Link href="/courses" style={PAGE_STYLES.link}>
              catalog
            </Link>{" "}
            to start checkout.
          </div>
        </div>
      </div>
    );
  }

  const returnPath = summary.pricingTierSlug
    ? `/checkout?pricingTier=${summary.pricingTierSlug}`
    : `/checkout?courseSlug=${summary.courseSlug}`;
  const formattedTotal = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: summary.currency,
  }).format(summary.amountMinor / 100);

  return (
    <div style={PAGE_STYLES.page}>
      <div style={PAGE_STYLES.card}>
        <div style={PAGE_STYLES.header}>
          <div style={PAGE_STYLES.logo}>Project Amazon PH Academy</div>
          <h1 style={PAGE_STYLES.title}>Confirm your purchase</h1>
          <p style={PAGE_STYLES.subtitle}>
            You'll be redirected to PayMongo to complete payment. We accept cards, GCash, and
            GrabPay.
          </p>
        </div>

        {/* Error alerts */}
        {state.kind === "unauthorized" && (
          <div style={{ ...PAGE_STYLES.alert, ...PAGE_STYLES.alertError }} role="alert">
            Please{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(returnPath)}`}
              style={PAGE_STYLES.link}
            >
              sign in
            </Link>{" "}
            to continue checkout.
          </div>
        )}
        {state.kind === "course_not_found" && (
          <div style={{ ...PAGE_STYLES.alert, ...PAGE_STYLES.alertError }} role="alert">
            That course was not found. It may have been removed.
          </div>
        )}
        {state.kind === "course_not_published" && (
          <div style={{ ...PAGE_STYLES.alert, ...PAGE_STYLES.alertError }} role="alert">
            This course is not available for purchase right now.
          </div>
        )}
        {(state.kind === "pricing_tier_not_found" || state.kind === "pricing_tier_unavailable") && (
          <div style={{ ...PAGE_STYLES.alert, ...PAGE_STYLES.alertError }} role="alert">
            This pricing offer is no longer available. Choose a current offer from the pricing page.
          </div>
        )}
        {state.kind === "already_enrolled" && (
          <div style={{ ...PAGE_STYLES.alert, ...PAGE_STYLES.alertInfo }} role="status">
            You're already enrolled in this course. Head to your{" "}
            <Link href="/dashboard" style={PAGE_STYLES.link}>
              dashboard
            </Link>
            .
          </div>
        )}
        {state.kind === "payment_error" && (
          <div style={{ ...PAGE_STYLES.alert, ...PAGE_STYLES.alertError }} role="alert">
            Could not start checkout: {state.message}. Please try again, or contact support if the
            problem persists.
          </div>
        )}
        {state.kind === "rate_limited" && (
          <div style={{ ...PAGE_STYLES.alert, ...PAGE_STYLES.alertError }} role="alert">
            Too many checkout attempts. Please wait a few minutes before trying again.
          </div>
        )}

        {/* Order summary */}
        <div style={PAGE_STYLES.summary}>
          <div style={PAGE_STYLES.summaryRow}>
            <span>Course</span>
            <span
              style={{
                color: "var(--ink-500)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                minWidth: 0,
                overflowWrap: "anywhere",
                textAlign: "right",
              }}
            >
              {summary.courseTitle}
            </span>
          </div>
          <div style={PAGE_STYLES.summaryRow}>
            <span>Subtotal</span>
            <span style={{ color: "var(--ink-500)" }}>{formattedTotal}</span>
          </div>
          <div style={PAGE_STYLES.summaryTotal}>
            <span>Total</span>
            <span>{formattedTotal}</span>
          </div>
        </div>

        <p style={PAGE_STYLES.hint}>
          This is the amount sent to PayMongo. We never store your card details.
        </p>

        <form action={formAction} style={PAGE_STYLES.form}>
          {"pricingTierSlug" in offer ? (
            <input type="hidden" name="pricingTierSlug" value={offer.pricingTierSlug} />
          ) : (
            <input type="hidden" name="courseSlug" value={offer.courseSlug} />
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || state.kind === "redirect"}
            style={{ width: "100%", marginTop: 8 }}
          >
            {isPending
              ? "Preparing checkout…"
              : state.kind === "redirect"
                ? "Redirecting to PayMongo…"
                : "Pay with PayMongo"}
          </button>
        </form>

        <p style={PAGE_STYLES.footer}>
          Need to pick a different course?{" "}
          <Link href="/courses" style={PAGE_STYLES.link}>
            Back to catalog
          </Link>
        </p>
      </div>
    </div>
  );
}

function checkoutLoadErrorMessage(error: CheckoutFormProps["loadError"]): string {
  switch (error) {
    case "course_not_found":
      return "That course could not be found.";
    case "course_not_published":
      return "That course is not available for purchase.";
    case "pricing_tier_not_found":
    case "pricing_tier_unavailable":
      return "That pricing offer is no longer available.";
    default:
      return "No checkout offer was selected.";
  }
}
