"use client";

/**
 * EnrollButton — client component for course enrollment action.
 * Story 017
 */

import { useActionState } from "react";
import { enrollStudent } from "@/app/actions/enroll";
import type { EnrollStudentOutput } from "@/usecases/EnrollStudent";
import { Money } from "@/lib/Money";

type EnrollState = EnrollStudentOutput | null;

export function EnrollButton({ courseId, priceMinor }: { courseId: string; priceMinor: number }) {
  const [state, formAction, isPending] = useActionState<EnrollState, FormData>(
    async (_prevState: EnrollState) => {
      return enrollStudent(courseId);
    },
    null,
  );

  const isFree = priceMinor === 0;

  if (state?.ok) {
    return (
      <div className="flex items-center gap-2 text-green-600 font-medium">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Enrolled! Check your dashboard.
      </div>
    );
  }

  if (state && !state.ok) {
    const err = state.error;
    if ("kind" in err && err.kind === "course_unpublished") {
      return <p className="text-[var(--text-secondary)]">This course is not available.</p>;
    }
    return <p className="text-red-500">Unable to enroll. Please try again.</p>;
  }

  return (
    <form action={formAction}>
      {isFree ? (
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Enrolling..." : "Enroll for Free"}
        </button>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Processing..." : `Enroll — ${Money.of(priceMinor, "PHP").format()}`}
        </button>
      )}
    </form>
  );
}
