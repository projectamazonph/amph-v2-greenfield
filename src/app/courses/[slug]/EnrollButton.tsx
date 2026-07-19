"use client";

/**
 * EnrollButton — client component for course enrollment action.
 * Story 017
 * P0-1: paywall enforcement.
 *
 * Free courses enroll via the server action.
 * Paid courses show a "Buy now" button that links to /checkout?courseId=...
 * The server decides based on the authoritative course.price; the
 * `isFree` prop on the client is presentation-only and is NEVER trusted
 * for the actual decision.
 *
 * The component shows one of these states:
 *  1. Idle (free): "Enroll for Free" button
 *  2. Idle (paid): "Buy now — ₱X,XXX" link to /checkout
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
  priceMinor,
}: {
  courseId: string;
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
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
      // Should be unreachable because paid courses render the Buy button
      // below; but if we ever land here, recover by linking to checkout.
      return (
        <Link href={`/checkout?courseId=${courseId}`} className={styles.fullWidth}>
          <Button type="button" variant="primary" size="lg" className={styles.fullWidth}>
            Continue to checkout
          </Button>
        </Link>
      );
    }
    return <p className={styles.error}>Unable to enroll. Please try again.</p>;
  }

  // Paid courses: never call the enroll action. Always show the Buy button.
  if (!isFree) {
    return (
      <Link href={`/checkout?courseId=${courseId}`} className={styles.fullWidth}>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className={styles.fullWidth}
        >
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
