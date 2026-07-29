"use client";

/**
 * LessonCompleteButton — marks the current lesson complete.
 *
 * STORY-027. The MarkLessonComplete use case had no caller until this
 * component; enrollment progress, lesson XP and certificate eligibility
 * all hang off it.
 *
 * Only rendered for students with an active enrollment. Preview readers
 * and anonymous visitors do not see it, because there is no enrollment
 * to record progress against.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLessonComplete } from "@/app/actions/markLessonComplete.action";
import styles from "./LessonCompleteButton.module.css";

interface Props {
  courseId: string;
  courseSlug: string;
  lessonId: string;
  /** Server-rendered starting state, from the student's enrollment. */
  initialCompleted: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Sign in again to save your progress.",
  enrollment_not_found: "Enroll in this course to track your progress.",
  enrollment_not_active: "Your enrollment is not active, so progress is not being saved.",
  course_not_found: "We could not find this course. Refresh and try again.",
  lesson_not_in_course: "We could not match this lesson to the course. Refresh and try again.",
};

export function LessonCompleteButton({ courseId, courseSlug, lessonId, initialCompleted }: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await markLessonComplete({ courseId, courseSlug, lessonId });
      if (!result.ok) {
        setError(ERROR_MESSAGES[result.error.kind] ?? "Could not save your progress.");
        return;
      }
      setCompleted(true);
      setProgressPercent(result.value.progressPercent);
      // Refresh so the sidebar checkmarks and section counts catch up.
      router.refresh();
    });
  };

  if (completed) {
    return (
      <div className={styles.doneRow}>
        <p className={styles.done}>
          <CheckIcon />
          <span>Lesson complete</span>
        </p>
        {progressPercent !== null && (
          <p className={styles.progress} role="status">
            {progressPercent === 100
              ? "That was the last lesson. Course complete."
              : `${progressPercent}% of this course done.`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <button type="button" className={styles.button} onClick={onClick} disabled={pending}>
        {pending ? "Saving…" : "Mark as complete"}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className={styles.checkIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
