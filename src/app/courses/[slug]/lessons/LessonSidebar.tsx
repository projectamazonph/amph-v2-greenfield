"use client";

/**
 * LessonSidebar — collapsible lesson navigation sidebar.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 *
 * Shows all sections and lessons. Highlights the current lesson.
 * Marks completed lessons with a checkmark.
 * Sections are collapsible (current lesson's section is open by default).
 */

"use client";

import type { Course } from "@/domain/entities/Course";

interface LessonSidebarProps {
  course: Course;
  currentLessonId: string;
  completedLessonIds: readonly string[];
}

export function LessonSidebar({ course, currentLessonId, completedLessonIds }: LessonSidebarProps) {
  // Find which section the current lesson is in
  const currentSectionIndex = course.curriculum.sections.findIndex((section) =>
    section.lessons.some((l) => l.id === currentLessonId),
  );

  return (
    <aside className="w-72 flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto">
      {/* Course title header */}
      <div className="sticky top-0 z-10 px-4 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <h2 className="font-semibold text-[var(--text)] truncate">{course.title}</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          {courseLessonCount(course)} lessons
        </p>
      </div>

      {/* Sections */}
      <nav className="py-2">
        {course.curriculum.sections.map((section, si) => {
          const isCurrentSection = si === currentSectionIndex;
          const isOpen = isCurrentSection;

          return (
            <div key={section.id} className="mb-1">
              {/* Section header */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                aria-expanded={isOpen}
              >
                <ChevronIcon expanded={isOpen} />
                <span className="truncate">
                  {si + 1}. {section.title}
                </span>
                <span className="ml-auto text-[10px] opacity-60">{section.lessons.length}</span>
              </button>

              {/* Lessons */}
              {isOpen && (
                <ul className="pb-2">
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

                    return (
                      <li key={lesson.id}>
                        <a
                          href={`/courses/${course.slug}/lessons/${lesson.id}`}
                          className={[
                            "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                            isCurrent
                              ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                              : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg)]",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {/* Status icon */}
                          {isCompleted ? (
                            <CheckIcon />
                          ) : isVideo ? (
                            <VideoIcon />
                          ) : (
                            <TextIcon />
                          )}

                          {/* Lesson title */}
                          <span className="flex-1 truncate">{lesson.title}</span>

                          {/* Duration badge for videos */}
                          {duration !== null && (
                            <span className="text-[10px] opacity-60 flex-shrink-0">
                              {duration}m
                            </span>
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

// ── Helpers ─────────────────────────────────────────────────

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
      className={["w-3 h-3 flex-shrink-0 transition-transform", expanded ? "rotate-90" : ""].join(" ")}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
