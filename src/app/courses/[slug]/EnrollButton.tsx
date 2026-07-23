"use client";

/**
 * EnrollButton — client component for course enrollment action.
 * STORY-017
 *
 * Renders a buy/enroll CTA for a course. The authoritative price
 * comes from the course's linked PricingTier (via the catalog API).
 *
 * - Free courses (priceMinor === 0): direct enroll via server action.
 * - Paid courses: redirect to /checkout?courseSlug=...
 *
 * The client-side `isFree` check is PRESENTATION ONLY. The server
 * always re-validates price before enrolling or creating a checkout.
 *
 * The component shows one of these states:
 *  1. Idle (paid): "Buy now — ₱X,XXX" link to /checkout
 *  2. Idle (free): "Enroll for Free" form button
 *  3. Pending: button disabled with "Enrolling..." or "Processing..."
 *  4. Success: a check icon + "Enrolled! Check your dashboard."
 *  5. Error: an error message
 */

import { useActionState } from "react";
import Link from "next/link";
import { enrollStudent, type EnrollStudentActionResult } from "@/app/actions/enroll";
import { Money } from "@/domain/values/Money";
import { Button } from "@/components/ui/Button";
import styles from "./EnrollButton.module.css";

type EnrollState = EnrollStudentActionResult | null;

export function EnrollButton({
  courseId,
  courseSlug,
  priceMinor,
}: {
  /** The course's UUID — used for free-course enroll action. */
  courseId: string;
  /** The course's URL slug — used for checkout redirect. */
  courseSlug: string;
  /** Effective price in minor PHP units from the PricingTier. */
  priceMinor: number;
}) {
  const [state, formAction, isPending] = useActionState<EnrollState, FormData>(
    async (_prevState: EnrollState) => {
      return enrollStudent(courseId);
    },
    null,
  );

  // isFree is PRESENTATION-ONLY. The server does its own check.
  const isFree = priceMinor === 0;

  if (state && state.ok) {
    return (
      <div className={styles.success}>
        <svg
          className={styles.successIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Enrolled! Check your dashboard.
      </div>
    );
  }

  if (state && !state.ok) {
    const err = state.error;
    if ("kind" in err && err.kind === "course_not_published") {
      return <p className={styles.notAvailable}>This course is not available.</p>;
    }
    if ("kind" in err && err.kind === "unauthorized") {
      return <p className={styles.error}>Please sign in to enroll.</p>;
    }
    if ("kind" in err && err.kind === "paid_checkout_required") {
      return (
        <Link href={`/checkout?courseSlug=${courseSlug}`} className={styles.fullWidth}>
          <Button type="button" variant="primary" size="lg" className={styles.fullWidth}>
            Continue to checkout
          </Button>
        </Link>
      );
    }
    return <p className={styles.error}>Unable to enroll. Please try again.</p>;
  }

  // Paid courses: redirect to checkout.
  if (!isFree) {
    return (
      <Link href={`/checkout?courseSlug=${courseSlug}`} className={styles.fullWidth}>
        <Button type="button" variant="primary" size="lg" className={styles.fullWidth}>
          Buy now — {Money.of(priceMinor, "PHP").format()}
        </Button>
      </Link>
    );
  }

  // Free courses: enroll via the server action.
  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className={styles.fullWidth}
        disabled={isPending}
      >
        {isPending ? "Enrolling..." : "Enroll for Free"}
      </Button>
    </form>
  );
}
