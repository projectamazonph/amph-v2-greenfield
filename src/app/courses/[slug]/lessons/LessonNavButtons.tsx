"use client";

/**
 * LessonNavButtons — title-aware previous / next lesson navigation.
 *
 * Renders as a sticky-positioned footer band pinned to the bottom of the
 * lesson reading column while a lesson is being read. The footer carries
 * an optional centered module-position label between the two buttons so
 * a learner always knows where the next click will land without having
 * to scroll back to the breadcrumb.
 *
 * The band is sticky inside the lesson main column (which scrolls
 * independently of the page), matching the existing sticky pattern used
 * by LessonTopBar and LessonSidebar. On narrow screens (max-width 640px)
 * the band drops sticky so the content area below is not eaten by an
 * always-visible footer; it then scrolls inline like the prior layout.
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
  /** Centered label between the two buttons, e.g. "Module 2 of 5 · Lesson 3 of 4". */
  positionLabel?: string | null;
}

export function LessonNavButtons({
  courseSlug,
  prevLesson,
  nextLesson,
  positionLabel,
}: LessonNavButtonsProps) {
  if (!prevLesson && !nextLesson) return null;

  return (
    <nav
      className={styles.row}
      aria-label="Lesson navigation"
      data-sticky="true"
      data-lesson-nav-footer="true"
    >
      {prevLesson ? (
        <Link
          href={`/courses/${courseSlug}/lessons/${prevLesson.id}`}
          className={`${styles.prevButton} ${styles.actionButton}`}
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
        <span aria-hidden="true" className={styles.actionPlaceholder} />
      )}

      {positionLabel ? (
        <p className={styles.positionLabel} aria-label={`Lesson position: ${positionLabel}`}>
          <span className={styles.positionLabelEyebrow}>You are here</span>
          <span className={styles.positionLabelText}>{positionLabel}</span>
        </p>
      ) : (
        <span aria-hidden="true" className={styles.positionPlaceholder} />
      )}

      {nextLesson ? (
        <Link
          href={`/courses/${courseSlug}/lessons/${nextLesson.id}`}
          className={`${styles.nextButton} ${styles.actionButton}`}
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
        <span aria-hidden="true" className={styles.actionPlaceholder} />
      )}
    </nav>
  );
}
