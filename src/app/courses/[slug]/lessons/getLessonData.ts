/**
 * getLessonData — find a lesson within a course curriculum and compute navigation.
 *
 * STORY-026: Lesson page (RSC + MDX render).
 */

import type { Course, Lesson } from "@/domain/entities/Course";

export interface LessonData {
  /** The lesson being viewed. */
  lesson: Lesson;
  /** ID of the previous lesson, or null if this is the first. */
  prevLessonId: string | null;
  /** ID of the next lesson, or null if this is the last. */
  nextLessonId: string | null;
  /** Title of the section this lesson belongs to. */
  sectionTitle: string;
  /** 0-based index of the section within the curriculum. */
  sectionIndex: number;
  /** 0-based index of the lesson within its section. */
  lessonIndex: number;
}

/**
 * Find a lesson by ID within a course's curriculum and compute surrounding lesson IDs.
 *
 * Returns null if the lesson ID is not found.
 */
export function getLessonData(course: Course, lessonId: string): LessonData | null {
  const { sections } = course.curriculum;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]!;
    for (let li = 0; li < section.lessons.length; li++) {
      const lesson = section.lessons[li]!;
      if (lesson.id === lessonId) {
        // Previous lesson: last lesson of the previous section, or last lesson of previous section
        let prevLessonId: string | null = null;
        if (li > 0) {
          prevLessonId = section.lessons[li - 1]!.id;
        } else if (si > 0) {
          const prevSection = sections[si - 1]!;
          prevLessonId = prevSection.lessons[prevSection.lessons.length - 1]!.id;
        }

        // Next lesson: next lesson in the same section, or first lesson of next section
        let nextLessonId: string | null = null;
        if (li < section.lessons.length - 1) {
          nextLessonId = section.lessons[li + 1]!.id;
        } else if (si < sections.length - 1) {
          nextLessonId = sections[si + 1]!.lessons[0]!.id;
        }

        return {
          lesson,
          prevLessonId,
          nextLessonId,
          sectionTitle: section.title,
          sectionIndex: si,
          lessonIndex: li,
        };
      }
    }
  }

  return null;
}
