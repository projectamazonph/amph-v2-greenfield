"use client";

/**
 * EnrollButton — client component for course enrollment action.
 * Story 017
 *
 * Uses the @/components/ui Button instead of raw <button> with
 * inline classes, to keep the design system enforced.
 *
 * The component shows one of three states:
 *  1. Idle: "Enroll for Free" or "Enroll — ₱X,XXX" button
 *  2. Pending: same button, disabled, with "Enrolling..." or "Processing..."
 *  3. Success: a check icon + "Enrolled! Check your dashboard."
 *  4. Error: an error message
 *
 * Migrated from Tailwind-style classes to the design-system
 * Button + CSS Modules + design tokens (no `local/no-tailwind-classes`
 * violations).
 *
 * The full-width styling is done via a CSS Module (`.fullWidth`)
 * rather than a `fullWidth` prop on Button — keeping the design
 * system primitive minimal (additive design-system changes belong
 * in their own prep story).
 */

import { useActionState } from "react";
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
    return <p className={styles.error}>Unable to enroll. Please try again.</p>;
  }

  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className={styles.fullWidth}
        disabled={isPending}
      >
        {isPending
          ? isFree
            ? "Enrolling..."
            : "Processing..."
          : isFree
            ? "Enroll for Free"
            : `Enroll — ${Money.of(priceMinor, "PHP").format()}`}
      </Button>
    </form>
  );
}
