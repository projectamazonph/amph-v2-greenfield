"use client";

/**
 * LessonNavButtons — Previous / Next lesson navigation.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import styles from "./LessonNavButtons.module.css";

interface LessonNavButtonsProps {
  courseSlug: string;
  prevLessonId: string | null;
  nextLessonId: string | null;
}

export function LessonNavButtons({ courseSlug, prevLessonId, nextLessonId }: LessonNavButtonsProps) {
  const hasPrev = prevLessonId !== null;
  const hasNext = nextLessonId !== null;

  if (!hasPrev && !hasNext) return null;

  return (
    <div className={styles.row}>
      {hasPrev ? (
        <a
          href={`/courses/${courseSlug}/lessons/${prevLessonId}`}
          className={styles.prevButton}
        >
          <ChevronLeft />
          <span>Previous</span>
        </a>
      ) : (
        <div />
      )}

      {hasNext ? (
        <a
          href={`/courses/${courseSlug}/lessons/${nextLessonId}`}
          className={styles.nextButton}
        >
          <span>Next Lesson</span>
          <ChevronRight />
        </a>
      ) : (
        <div />
      )}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
