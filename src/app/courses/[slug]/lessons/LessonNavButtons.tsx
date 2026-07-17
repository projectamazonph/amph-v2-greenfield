"use client";

/**
 * LessonNavButtons — Previous / Next lesson navigation.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 */

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
    <div className="flex items-center justify-between gap-4">
      {hasPrev ? (
        <a
          href={`/courses/${courseSlug}/lessons/${prevLessonId}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--text-secondary)] transition-colors"
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity ml-auto"
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
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
