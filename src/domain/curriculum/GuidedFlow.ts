/**
 * GuidedFlow — shared zero-knowledge learner-order and prerequisite rules.
 *
 * The content directory order is not the learner order. Listing readiness must
 * precede targeting and campaign construction so a new learner understands
 * that ads cannot repair a weak product page.
 */

export const LEARNER_MODULE_ORDER = [
  "onboarding",
  "foundations",
  "listing optimization",
  "keyword research",
  "campaign architecture",
  "portfolio strategy",
  "bidding lab",
  "search term triage",
  "competitive intelligence",
  "weekly optimization",
  "reporting troubleshooting",
  "va workflow capstone",
] as const;

export type GuidedModule = {
  readonly id: string;
  readonly title: string;
  readonly displayOrder?: number;
  readonly lessons: readonly { readonly id: string; readonly title?: string }[];
};

export type GuidedSection = {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly { readonly id: string; readonly title?: string }[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");
}

export function learnerModuleRank(title: string): number {
  const normalized = normalize(title);
  const index = LEARNER_MODULE_ORDER.findIndex((candidate) => normalized.includes(candidate));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function orderLearnerModules<T extends GuidedModule>(modules: readonly T[]): T[] {
  return [...modules].sort((a, b) => {
    const rankDiff = learnerModuleRank(a.title) - learnerModuleRank(b.title);
    if (rankDiff !== 0) return rankDiff;
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });
}

export function flattenLessons(sections: readonly GuidedSection[]) {
  return sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      ...lesson,
      sectionId: section.id,
      sectionTitle: section.title,
    })),
  );
}

export function prerequisiteForLesson(
  sections: readonly GuidedSection[],
  lessonId: string,
): { id: string; title: string } | null {
  const lessons = flattenLessons(sections);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return null;
  const previous = lessons[index - 1];
  return previous ? { id: previous.id, title: previous.title ?? "the previous lesson" } : null;
}

export function isLessonUnlocked(
  sections: readonly GuidedSection[],
  completedLessonIds: readonly string[],
  lessonId: string,
): boolean {
  const prerequisite = prerequisiteForLesson(sections, lessonId);
  return prerequisite === null || completedLessonIds.includes(prerequisite.id);
}

export function isModuleComplete(
  sections: readonly GuidedSection[],
  completedLessonIds: readonly string[],
): boolean {
  return flattenLessons(sections).every((lesson) => completedLessonIds.includes(lesson.id));
}
