/**
 * Pure onboarding-completion helpers — no server-only code.
 *
 * The onboarding-complete page uses these helpers to decide whether
 * the learner has finished Module 0 and to resolve the first
 * Module 1 lesson.
 */

export interface OnboardingLessonRef {
  readonly id: string;
  readonly title: string;
  readonly estimatedMinutes: number;
  readonly displayOrder: number;
}

export interface OnboardingModuleRef {
  readonly id: string;
  readonly title: string;
  readonly moduleNumber: number;
  readonly displayOrder: number;
  readonly lessons: readonly OnboardingLessonRef[];
}

export type OnboardingStatus =
  | {
      kind: "complete";
      nextModuleTitle: string;
      nextLesson: OnboardingLessonRef;
      totalMinutes: number;
    }
  | { kind: "missing_module_zero" }
  | { kind: "no_next_module"; nextModuleTitle: string }
  | { kind: "module_zero_incomplete"; missingLessonCount: number };

/**
 * Resolves the onboarding status for the learner. Pure function so
 * it can be unit-tested without any database or framework
 * dependency.
 *
 * Module 0 is identified by the module with the smallest
 * `moduleNumber` in the modules list. If that module has no lessons,
 * the helper returns `missing_module_zero`. If every lesson in
 * Module 0 is in `completedLessonIds`, the helper returns
 * `complete` with the next module's first lesson. Otherwise it
 * returns `module_zero_incomplete` with the count of remaining
 * lessons so the page can redirect with a helpful message.
 */
export function resolveOnboardingStatus(
  modules: readonly OnboardingModuleRef[],
  completedLessonIds: readonly string[],
): OnboardingStatus {
  if (modules.length === 0) return { kind: "missing_module_zero" };

  const sortedModules = [...modules].sort((a, b) => a.moduleNumber - b.moduleNumber);
  const moduleZero = sortedModules[0];
  if (!moduleZero || moduleZero.lessons.length === 0) {
    return { kind: "missing_module_zero" };
  }

  const completed = new Set<string>(completedLessonIds);
  const missingLessons = moduleZero.lessons.filter((lesson) => !completed.has(lesson.id));
  if (missingLessons.length > 0) {
    return { kind: "module_zero_incomplete", missingLessonCount: missingLessons.length };
  }

  const nextModule = sortedModules[1];
  if (!nextModule || nextModule.lessons.length === 0) {
    return { kind: "no_next_module", nextModuleTitle: moduleZero.title };
  }

  const sortedNextLessons = [...nextModule.lessons].sort((a, b) => a.displayOrder - b.displayOrder);
  const nextLesson = sortedNextLessons[0];
  if (!nextLesson) {
    return { kind: "no_next_module", nextModuleTitle: nextModule.title };
  }

  const totalMinutes = nextModule.lessons.reduce(
    (sum, lesson) => sum + (lesson.estimatedMinutes > 0 ? lesson.estimatedMinutes : 0),
    0,
  );

  return {
    kind: "complete",
    nextModuleTitle: nextModule.title,
    nextLesson,
    totalMinutes,
  };
}
