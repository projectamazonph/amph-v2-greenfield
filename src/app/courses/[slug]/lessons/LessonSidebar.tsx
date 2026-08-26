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

import Link from "next/link";
import type { Course } from "@/domain/entities/Course";
import { CaretRight, CaretDown, CheckCircle, Play, Article } from "@phosphor-icons/react/dist/ssr";
import styles from "./LessonSidebar.module.css";
import { useEffect, useState } from "react";
import { isLessonUnlocked } from "@/domain/curriculum/GuidedFlow";

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
  const currentSectionId = course.curriculum.sections[currentSectionIndex]?.id;
  const totalLessonCount = courseLessonCount(course);
  const completedLessonCount = course.curriculum.sections.flatMap((section) => section.lessons)
    .filter((lesson) => completedLessonIds.includes(lesson.id)).length;
  const courseProgress = totalLessonCount === 0
    ? 0
    : Math.round((completedLessonCount / totalLessonCount) * 100);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(currentSectionId ? [currentSectionId] : []),
  );

  useEffect(() => {
    if (!currentSectionId) return;
    setOpenSections((current) => {
      if (current.has(currentSectionId)) return current;
      return new Set(current).add(currentSectionId);
    });
  }, [currentSectionId]);

  function toggleSection(sectionId: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  return (
    <aside className={styles.sidebar}>
      {/* Course title header */}
      <div className={styles.header}>
        <p className={styles.routeLabel}>Learning route</p>
        <h2 className={styles.headerTitle}>{course.title}</h2>
        <div className={styles.courseProgressSummary}>
          <span>{completedLessonCount} of {totalLessonCount} lessons</span>
          <strong>{courseProgress}%</strong>
        </div>
        <div
          className={styles.courseProgressTrack}
          aria-label={`Course progress: ${courseProgress}%`}
        >
          <span style={{ width: `${courseProgress}%` }} />
        </div>
        <p className={styles.headerSubtitle}>Read, decide, then apply.</p>
      </div>

      {/* Sections */}
      <nav className={styles.nav} aria-label="Course curriculum">
        {course.curriculum.sections.map((section, si) => {
          const isCurrentSection = si === currentSectionIndex;
          const isOpen = openSections.has(section.id);
          const completedCount = section.lessons.filter((l) =>
            completedLessonIds.includes(l.id),
          ).length;

          const sectionNavId = `${course.slug}-section-${section.id}`;
          return (
            <div key={section.id} className={styles.section}>
              {/* Section header */}
              <button
                className={styles.sectionHeader}
                aria-expanded={isOpen}
                aria-controls={sectionNavId}
                type="button"
                onClick={() => toggleSection(section.id)}
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
              <ul id={sectionNavId} className={styles.lessonList} hidden={!isOpen}>
                {isOpen
                  ? section.lessons.map((lesson) => {
                      const isCurrent = lesson.id === currentLessonId;
                      const isCompleted = completedLessonIds.includes(lesson.id);
                      const isUnlocked =
                        isCurrent ||
                        isCompleted ||
                        isLessonUnlocked(course.curriculum.sections, completedLessonIds, lesson.id);
                      const isVideo = lesson.type === "VIDEO";
                      const duration =
                        lesson.plannedMinutes && lesson.plannedMinutes > 0
                          ? lesson.plannedMinutes
                          : isVideo &&
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
                          {isUnlocked ? (
                            <Link
                              href={`/courses/${course.slug}/lessons/${lesson.id}`}
                              className={linkClass}
                              aria-current={isCurrent ? "page" : undefined}
                            >
                              {isCompleted ? <CheckIcon /> : isVideo ? <VideoIcon /> : <TextIcon />}
                              <span className={styles.lessonTitle}>{lesson.title}</span>
                              {duration !== null && (
                                <span className={styles.lessonDuration}>{duration}m</span>
                              )}
                            </Link>
                          ) : (
                            <span
                              className={`${linkClass} ${styles.lessonLinkLocked}`}
                              aria-label={`${lesson.title} locked until the previous lesson is complete`}
                            >
                              <LockIcon />
                              <span className={styles.lessonTitle}>{lesson.title}</span>
                              {duration !== null && (
                                <span className={styles.lessonDuration}>{duration}m</span>
                              )}
                            </span>
                          )}
                        </li>
                      );
                    })
                  : null}
              </ul>
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

function LockIcon() {
  return (
    <span aria-hidden className={styles.iconSmall}>
      🔒
    </span>
  );
}

function TextIcon() {
  return (
    <Article
      size={14}
      weight="regular"
      className={`${styles.iconSmall} ${styles.iconMuted}`}
      aria-hidden
    />
  );
}
