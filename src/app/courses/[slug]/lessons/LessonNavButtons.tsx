"use client";

/**
 * LessonNavButtons — title-aware previous / next lesson navigation.
 *
 * Keeps movement between lessons lightweight while exposing enough context
 * for a learner to know exactly where the link will take them.
 */

import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import styles from "./LessonNavButtons.module.css";

export interface LessonNavTarget {
  id: string;
  title: string;
  sectionTitle: string;
}

interface LessonNavButtonsProps {
  courseSlug: string;
  prevLesson: LessonNavTarget | null;
  nextLesson: LessonNavTarget | null;
}

export function LessonNavButtons({ courseSlug, prevLesson, nextLesson }: LessonNavButtonsProps) {
  if (!prevLesson && !nextLesson) return null;

  return (
    <nav className={styles.row} aria-label="Lesson navigation">
      {prevLesson ? (
        <Link
          href={`/courses/${courseSlug}/lessons/${prevLesson.id}`}
          className={styles.prevButton}
          aria-label={`Previous lesson: ${prevLesson.title}`}
        >
          <CaretLeft size={20} weight="bold" className={styles.chevron} aria-hidden />
          <span className={styles.buttonCopy}>
            <span className={styles.direction}>Previous</span>
            <strong>{prevLesson.title}</strong>
            <span className={styles.section}>{prevLesson.sectionTitle}</span>
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      {nextLesson ? (
        <Link
          href={`/courses/${courseSlug}/lessons/${nextLesson.id}`}
          className={styles.nextButton}
          aria-label={`Next lesson: ${nextLesson.title}`}
        >
          <span className={styles.buttonCopy}>
            <span className={styles.direction}>Next lesson</span>
            <strong>{nextLesson.title}</strong>
            <span className={styles.section}>{nextLesson.sectionTitle}</span>
          </span>
          <CaretRight size={20} weight="bold" className={styles.chevron} aria-hidden />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
