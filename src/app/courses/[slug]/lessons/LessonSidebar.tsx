"use client";

/**
 * LessonSidebar — collapsible lesson navigation sidebar.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 *
 * Shows all sections and lessons. Highlights the current lesson.
 * Marks completed lessons with a checkmark.
 * Sections are collapsible (current lesson's section is open by default).
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 *
 * Takes a plain view model, NOT the `Course` entity. `Course.price` is a
 * `Money` class instance, and React cannot serialize a class across the
 * server/client boundary, so passing the entity in threw
 * "Only plain objects ... can be passed to Client Components" and 500'd
 * every lesson page a reader could actually open. Keep this shape plain.
 */

import { useState } from "react";
import styles from "./LessonSidebar.module.css";

export interface SidebarLesson {
  id: string;
  title: string;
  type: string;
  /** Minutes, for VIDEO lessons. Null for everything else. */
  durationMinutes: number | null;
}

export interface SidebarSection {
  id: string;
  title: string;
  lessons: readonly SidebarLesson[];
}

interface LessonSidebarProps {
  courseTitle: string;
  courseSlug: string;
  sections: readonly SidebarSection[];
  currentLessonId: string;
  completedLessonIds: readonly string[];
}

export function LessonSidebar({
  courseTitle,
  courseSlug,
  sections,
  currentLessonId,
  completedLessonIds,
}: LessonSidebarProps) {
  const currentSectionIndex = sections.findIndex((section) =>
    section.lessons.some((l) => l.id === currentLessonId),
  );
  const totalLessons = sections.reduce((total, section) => total + section.lessons.length, 0);

  // The section headers were rendered as buttons with aria-expanded but
  // `isOpen` was a const, so clicking did nothing and the ARIA state was
  // a lie. Track the open set for real, seeded with the current section.
  const [openSectionIndexes, setOpenSectionIndexes] = useState<ReadonlySet<number>>(
    () => new Set(currentSectionIndex === -1 ? [] : [currentSectionIndex]),
  );

  const toggleSection = (index: number) => {
    setOpenSectionIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <aside className={styles.sidebar}>
      {/* Course title header */}
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>{courseTitle}</h2>
        <p className={styles.headerSubtitle}>{totalLessons} lessons</p>
      </div>

      {/* Sections */}
      <nav className={styles.nav}>
        {sections.map((section, si) => {
          const isOpen = openSectionIndexes.has(si);
          const completedCount = section.lessons.filter((l) =>
            completedLessonIds.includes(l.id),
          ).length;

          return (
            <div key={section.id} className={styles.section}>
              {/* Section header */}
              <button
                className={styles.sectionHeader}
                aria-expanded={isOpen}
                onClick={() => toggleSection(si)}
                type="button"
              >
                <ChevronIcon expanded={isOpen} />
                <span className={styles.sectionTitle}>
                  {si + 1}. {section.title}
                </span>
                <span className={styles.sectionProgress}>
                  {completedCount}/{section.lessons.length}
                </span>
              </button>

              {/* Lessons */}
              {isOpen && (
                <ul className={styles.lessonList}>
                  {section.lessons.map((lesson) => {
                    const isCurrent = lesson.id === currentLessonId;
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const isVideo = lesson.type === "VIDEO";
                    const duration = lesson.durationMinutes;

                    const linkClass = [
                      styles.lessonLink,
                      isCurrent ? styles.lessonLinkCurrent : styles.lessonLinkDefault,
                    ].join(" ");

                    return (
                      <li key={lesson.id}>
                        <a
                          href={`/courses/${courseSlug}/lessons/${lesson.id}`}
                          className={linkClass}
                        >
                          {isCompleted ? <CheckIcon /> : isVideo ? <VideoIcon /> : <TextIcon />}

                          <span className={styles.lessonTitle}>{lesson.title}</span>

                          {duration !== null && (
                            <span className={styles.lessonDuration}>{duration}m</span>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// ── Icons ───────────────────────────────────────────────────

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`${styles.iconTiny} ${expanded ? styles.iconRotated : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className={`${styles.iconSmall} ${styles.iconSuccess}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      className={`${styles.iconSmall} ${styles.iconAccent}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg
      className={`${styles.iconSmall} ${styles.iconMuted}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
