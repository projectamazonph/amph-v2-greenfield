"use client";

/**
 * CourseCompleteView — full-screen celebration when a student completes all lessons.
 *
 * STORY-030: Module progress + next-lesson navigation + course completion view.
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import { Trophy, Star, Certificate, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import styles from "./CourseCompleteView.module.css";

interface CourseCompleteViewProps {
  courseTitle: string;
  totalXp: number;
  certificateUrl: string;
}

export function CourseCompleteView({ courseTitle, totalXp, certificateUrl }: CourseCompleteViewProps) {
  return (
    <div className={styles.container}>
      {/* Trophy / celebration icon */}
      <div className={styles.trophyWrapper}>
        <TrophyIcon />
      </div>

      {/* Heading */}
      <h1 className={styles.heading}>Course Complete! 🎉</h1>

      {/* Course name */}
      <p className={styles.subheading}>
        Congratulations on completing <strong>{courseTitle}</strong>. You&apos;ve mastered all the lessons!
      </p>

      {/* XP earned */}
      <div className={styles.xpBadge}>
        <StarIcon />
        <span>{totalXp.toLocaleString()} XP earned</span>
      </div>

      {/* Certificate CTA */}
      <a href={certificateUrl} className={styles.certificateCta}>
        <CertificateIcon />
        <span>View Certificate</span>
      </a>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────

function TrophyIcon() {
  return (
    <Trophy
      size={80}
      weight="fill"
      className={styles.trophyIcon}
      aria-hidden
    />
  );
}

function StarIcon() {
  return (
    <Star
      size={20}
      weight="fill"
      className={styles.starIcon}
      aria-hidden
    />
  );
}

function CertificateIcon() {
  return (
    <Certificate
      size={20}
      weight="regular"
      className={styles.certIcon}
      aria-hidden
    />
  );
}
