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
 */

import type { Course } from "@/domain/entities/Course";
import styles from "./LessonSidebar.module.css";

interface LessonSidebarProps {
  course: Course;
  currentLessonId: string;
  completedLessonIds: readonly string[];
}

export function LessonSidebar({ course, currentLessonId, completedLessonIds }: LessonSidebarProps) {
  const currentSectionIndex = course.curriculum.sections.findIndex((section) =>
    section.lessons.some((l) => l.id === currentLessonId),
  );

  return (
    <aside className={styles.sidebar}>
      {/* Course title header */}
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>{course.title}</h2>
        <p className={styles.headerSubtitle}>
          {courseLessonCount(course)} lessons
        </p>
      </div>

      {/* Sections */}
      <nav className={styles.nav}>
        {course.curriculum.sections.map((section, si) => {
          const isCurrentSection = si === currentSectionIndex;
          const isOpen = isCurrentSection;
          const completedCount = section.lessons.filter((l) =>
            completedLessonIds.includes(l.id),
          ).length;

          return (
            <div key={section.id} className={styles.section}>
              {/* Section header */}
              <button
                className={styles.sectionHeader}
                aria-expanded={isOpen}
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
                    const duration =
                      isVideo &&
                      typeof lesson.content === "object" &&
                      lesson.content !== null &&
                      "durationMinutes" in lesson.content
                        ? (lesson.content as { durationMinutes: number }).durationMinutes
                        : null;

                    const linkClass = [
                      styles.lessonLink,
                      isCurrent ? styles.lessonLinkCurrent : styles.lessonLinkDefault,
                    ].join(" ");

                    return (
                      <li key={lesson.id}>
                        <a href={`/courses/${course.slug}/lessons/${lesson.id}`} className={linkClass}>
                          {isCompleted ? (
                            <CheckIcon />
                          ) : isVideo ? (
                            <VideoIcon />
                          ) : (
                            <TextIcon />
                          )}

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

function courseLessonCount(course: Course): number {
  return course.curriculum.sections.reduce(
    (total, section) => total + section.lessons.length,
    0,
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M5 13l4 4L19 7"
      />
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
