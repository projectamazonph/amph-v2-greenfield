"use client";

/**
 * LessonNavButtons — Previous / Next lesson navigation.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
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
    <CaretLeft
      size={20}
      weight="bold"
      className={styles.chevron}
      aria-hidden
    />
  );
}

function ChevronRight() {
  return (
    <CaretRight
      size={20}
      weight="bold"
      className={styles.chevron}
      aria-hidden
    />
  );
}
