/**
 * ProgressService — pure functions for computing lesson progress.
 *
 * STORY-027: MarkLessonComplete use case + ProgressService + ProgressEvent log.
 */

/**
 * Compute the progress percentage (0–100) from completed lesson IDs and total lesson count.
 * Uses Math.round (e.g. 1/3 = 33, 2/3 = 67).
 * Caps at 100 if completed > total (defensive).
 */
export function computeProgressPercent(
  completedLessonIds: readonly string[],
  totalLessons: number,
): number {
  if (totalLessons <= 0) return 0;
  const percent = Math.round((completedLessonIds.length / totalLessons) * 100);
  return Math.min(100, percent);
}

/**
 * Is the course fully completed?
 */
export function isCourseCompleted(
  completedLessonIds: readonly string[],
  totalLessons: number,
): boolean {
  return completedLessonIds.length >= totalLessons && totalLessons > 0;
}
