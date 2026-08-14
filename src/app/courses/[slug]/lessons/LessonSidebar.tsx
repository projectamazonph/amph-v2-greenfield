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
import { CaretRight, CaretDown, CheckCircle, Play } from "@phosphor-icons/react/dist/ssr";
import styles from "./LessonSidebar.module.css";

// Only the plain-data subset of Course this component needs. Course.price is
// a Money class instance, and passing the full Course (server-fetched) into
// this "use client" component would fail Next's RSC serialization boundary
// ("Only plain objects... can be passed to Client Components"). Pick<> keeps
// this in sync with Course's field types without re-declaring them.
type LessonSidebarCourse = Pick<Course, "slug" | "title" | "curriculum">;

interface LessonSidebarProps {
  course: LessonSidebarCourse;
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
        <p className={styles.headerSubtitle}>{courseLessonCount(course)} lessons</p>
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
              <button className={styles.sectionHeader} aria-expanded={isOpen} type="button">
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
                        <a
                          href={`/courses/${course.slug}/lessons/${lesson.id}`}
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

function courseLessonCount(course: LessonSidebarCourse): number {
  return course.curriculum.sections.reduce((total, section) => total + section.lessons.length, 0);
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  const Icon = expanded ? CaretDown : CaretRight;
  return (
    <Icon
      size={12}
      weight="bold"
      className={`${styles.iconTiny} ${expanded ? styles.iconRotated : ""}`}
      aria-hidden
    />
  );
}

function CheckIcon() {
  return (
    <CheckCircle
      size={14}
      weight="fill"
      className={`${styles.iconSmall} ${styles.iconSuccess}`}
      aria-hidden
    />
  );
}

function VideoIcon() {
  return (
    <Play
      size={14}
      weight="fill"
      className={`${styles.iconSmall} ${styles.iconAccent}`}
      aria-hidden
    />
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
