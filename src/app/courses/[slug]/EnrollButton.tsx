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
import { Result } from "@/domain/shared/Result";
import { Button } from "@/components/ui/Button";
import buttonStyles from "@/components/ui/Button.module.css";
import { studentErrorCopy } from "@/lib/studentErrorCopy";
import styles from "./EnrollButton.module.css";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

type EnrollState = EnrollStudentActionResult | null;

export function EnrollButton({
  courseId,
  courseSlug,
  priceMinor,
  accessMode = "purchase",
  firstLessonId,
}: {
  /** The course's UUID — used for free-course enroll action. */
  courseId: string;
  /** The course's URL slug — used for checkout redirect. */
  courseSlug: string;
  /** Effective price in minor PHP units from the PricingTier. */
  priceMinor: number;
  accessMode?: "purchase" | "subscription" | "enrolled" | "admin";
  firstLessonId?: string | null;
}) {
  const [state, formAction, isPending] = useActionState<EnrollState, FormData>(
    async (_prevState: EnrollState) => {
      return enrollStudent(courseId);
    },
    null,
  );

  // isFree is PRESENTATION-ONLY. The server does its own check.
  const isFree = priceMinor === 0;

  if ((accessMode === "enrolled" || accessMode === "admin") && firstLessonId) {
    return (
      <Link
        href={`/courses/${courseSlug}/lessons/${firstLessonId}`}
        className={[buttonStyles.btn, buttonStyles.primary, buttonStyles.lg, styles.fullWidth].join(
          " ",
        )}
      >
        Continue learning
      </Link>
    );
  }

  if (state && state.ok) {
    return (
      <div className={styles.success} role="status">
        <CheckCircle
          size={24}
          weight="fill"
          className={styles.successIcon}
          aria-hidden
        />
        Enrolled! Check your dashboard.
      </div>
    );
  }

  if (state && !state.ok) {
    const err = state.error;
    if ("kind" in err && err.kind === "course_not_published") {
      return (
        <p className={styles.notAvailable} role="alert">
          This course is not available.
        </p>
      );
    }
    if ("kind" in err && err.kind === "unauthorized") {
      return (
        <p className={styles.error} role="alert">
          Please sign in to enroll.
        </p>
      );
    }
    if ("kind" in err && err.kind === "paid_checkout_required") {
      return (
        <Link
          href={`/checkout?courseSlug=${courseSlug}`}
          className={[
            buttonStyles.btn,
            buttonStyles.primary,
            buttonStyles.lg,
            styles.fullWidth,
          ].join(" ")}
        >
          Continue to checkout
        </Link>
      );
    }
    return (
      <p className={styles.error} role="alert">
        {studentErrorCopy.enrollment}
      </p>
    );
  }

  if (!isFree && accessMode !== "subscription") {
    return (
      <Link
        href={`/checkout?courseSlug=${courseSlug}`}
        className={[buttonStyles.btn, buttonStyles.primary, buttonStyles.lg, styles.fullWidth].join(
          " ",
        )}
      >
        Buy now — {Result.unwrap(Money.of(priceMinor, "PHP")).format()}
      </Link>
    );
  }

  const label = accessMode === "subscription" ? "Start course" : "Enroll for Free";

  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className={styles.fullWidth}
        disabled={isPending}
      >
        {isPending ? "Enrolling..." : label}
      </Button>
    </form>
  );
}
