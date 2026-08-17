import type { Result } from "@/domain/shared/Result";
import { Result as ResultFactory } from "@/domain/shared/Result";

export type CurriculumTier =
  | "pp-foundations"
  | "accelerated-mastery"
  | "ultimate-transformation";

export type CurriculumToolBridge =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "simulator"; target: string }>;

export interface CurriculumLessonContract {
  readonly slug: string;
  readonly toolBridge: CurriculumToolBridge;
  readonly resourceRefs: readonly string[];
  readonly finalDeliverable: string | null;
}

export interface CurriculumInventoryManifest {
  readonly schemaVersion: 1;
  readonly courses: Readonly<Record<string, Readonly<{ tier: CurriculumTier }>>>;
  readonly lessons: readonly CurriculumLessonContract[];
}

export interface CurriculumSourceLesson {
  readonly title: string;
  readonly slug: string;
  readonly moduleNumber: number;
  readonly lessonNumber: number;
  readonly type: string;
  readonly estimatedMinutes: number;
  readonly xpReward: number;
  readonly sourcePath: string;
}

export interface CurriculumSourceGroup {
  readonly courseSlug: string;
  readonly lessons: readonly CurriculumSourceLesson[];
}

export interface CurriculumInventoryLesson {
  readonly slug: string;
  readonly title: string;
  readonly courseSlug: string;
  readonly tier: CurriculumTier;
  readonly moduleNumber: number;
  readonly lessonNumber: number;
  readonly type: string;
  readonly plannedMinutes: number;
  readonly xpReward: number;
  readonly toolBridge: CurriculumToolBridge;
  readonly resourceRefs: readonly string[];
  readonly finalDeliverable: string | null;
  readonly sourcePath: string;
}

export interface CurriculumInventory {
  readonly schemaVersion: 1;
  readonly lessons: readonly CurriculumInventoryLesson[];
}

export interface CurriculumInventorySummary {
  readonly lessonCount: number;
  readonly totalPlannedMinutes: number;
  readonly totalXp: number;
  readonly lessonsByCourse: Readonly<Record<string, number>>;
}

export type CurriculumInventoryError = Readonly<{
  kind:
    | "invalid_manifest"
    | "duplicate_source_slug"
    | "duplicate_manifest_slug"
    | "missing_manifest_lesson"
    | "orphan_manifest_lesson"
    | "missing_tier_mapping"
    | "missing_minutes"
    | "missing_tool_target"
    | "course_mismatch";
  message: string;
  slug?: string;
  courseSlug?: string;
}>;

const CURRICULUM_TIERS: readonly CurriculumTier[] = [
  "pp-foundations",
  "accelerated-mastery",
  "ultimate-transformation",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCurriculumTier(value: unknown): value is CurriculumTier {
  return typeof value === "string" && CURRICULUM_TIERS.includes(value as CurriculumTier);
}

function invalidManifest(message: string, slug?: string): CurriculumInventoryError {
  return { kind: "invalid_manifest", message, ...(slug ? { slug } : {}) };
}

/**
 * Parses the checked-in inventory contract before it is used by a build.
 * The parser deliberately returns every structural error so the release check
 * can fix one manifest in one pass instead of failing one row at a time.
 */
export function parseCurriculumInventoryManifest(
  input: unknown,
): Result<CurriculumInventoryManifest, readonly CurriculumInventoryError[]> {
  const errors: CurriculumInventoryError[] = [];
  if (!isRecord(input)) {
    return ResultFactory.err([invalidManifest("Manifest must be an object")]);
  }

  if (input.schemaVersion !== 1) {
    errors.push(invalidManifest("Manifest schemaVersion must be 1"));
  }

  const courses = input.courses;
  const parsedCourses: Record<string, { tier: CurriculumTier }> = {};
  if (!isRecord(courses)) {
    errors.push(invalidManifest("Manifest courses must be an object"));
  } else {
    for (const [courseSlug, value] of Object.entries(courses)) {
      if (!isRecord(value) || !isCurriculumTier(value.tier)) {
        errors.push({
          kind: "missing_tier_mapping",
          message: `Course "${courseSlug}" must map to a curriculum tier`,
          courseSlug,
        });
        continue;
      }
      parsedCourses[courseSlug] = { tier: value.tier };
    }
  }

  const lessons = input.lessons;
  const parsedLessons: CurriculumLessonContract[] = [];
  const seenSlugs = new Set<string>();
  if (!Array.isArray(lessons)) {
    errors.push(invalidManifest("Manifest lessons must be an array"));
  } else {
    for (const value of lessons) {
      if (!isRecord(value) || !isNonEmptyString(value.slug)) {
        errors.push(invalidManifest("Every manifest lesson needs a non-empty slug"));
        continue;
      }

      const slug = value.slug.trim();
      if (seenSlugs.has(slug)) {
        errors.push({
          kind: "duplicate_manifest_slug",
          message: `Manifest contains duplicate lesson slug "${slug}"`,
          slug,
        });
        continue;
      }
      seenSlugs.add(slug);

      const toolBridge = value.toolBridge;
      if (!isRecord(toolBridge) || (toolBridge.kind !== "none" && toolBridge.kind !== "simulator")) {
        errors.push(invalidManifest(`Lesson "${slug}" needs a toolBridge kind`, slug));
        continue;
      }
      const toolTarget = toolBridge.target;
      let normalizedToolBridge: CurriculumToolBridge;
      if (toolBridge.kind === "none") {
        normalizedToolBridge = { kind: "none" };
      } else {
        if (!isNonEmptyString(toolTarget)) {
          errors.push({
            kind: "missing_tool_target",
            message: `Lesson "${slug}" has a simulator bridge without a target`,
            slug,
          });
          continue;
        }
        normalizedToolBridge = { kind: "simulator", target: toolTarget.trim() };
      }

      const rawResourceRefs = value.resourceRefs;
      if (
        !Array.isArray(rawResourceRefs) ||
        rawResourceRefs.some((resourceRef) => !isNonEmptyString(resourceRef))
      ) {
        errors.push(invalidManifest(`Lesson "${slug}" needs a resourceRefs array`, slug));
        continue;
      }

      const finalDeliverable = value.finalDeliverable;
      if (finalDeliverable !== null && !isNonEmptyString(finalDeliverable)) {
        errors.push(invalidManifest(`Lesson "${slug}" needs a finalDeliverable or null`, slug));
        continue;
      }

      const resourceRefs = rawResourceRefs
        .filter(isNonEmptyString)
        .map((resourceRef) => resourceRef.trim());

      parsedLessons.push({
        slug,
        toolBridge: normalizedToolBridge,
        resourceRefs,
        finalDeliverable:
          finalDeliverable === null ? null : finalDeliverable.trim(),
      });
    }
  }

  return errors.length > 0
    ? ResultFactory.err(errors)
    : ResultFactory.ok({ schemaVersion: 1, courses: parsedCourses, lessons: parsedLessons });
}

/**
 * Joins frontmatter (source lesson truth) with the reviewed learning contract.
 * A release must fail when content and the contract drift apart.
 */
export function buildCurriculumInventory(
  sourceGroups: readonly CurriculumSourceGroup[],
  manifest: CurriculumInventoryManifest,
): Result<CurriculumInventory, readonly CurriculumInventoryError[]> {
  const errors: CurriculumInventoryError[] = [];
  const sourceBySlug = new Map<string, { courseSlug: string; lesson: CurriculumSourceLesson }>();
  const manifestBySlug = new Map<string, CurriculumLessonContract>();

  for (const group of sourceGroups) {
    for (const lesson of group.lessons) {
      if (sourceBySlug.has(lesson.slug)) {
        errors.push({
          kind: "duplicate_source_slug",
          message: `Source content contains duplicate lesson slug "${lesson.slug}"`,
          slug: lesson.slug,
        });
        continue;
      }
      sourceBySlug.set(lesson.slug, { courseSlug: group.courseSlug, lesson });
      if (!Number.isFinite(lesson.estimatedMinutes) || lesson.estimatedMinutes <= 0) {
        errors.push({
          kind: "missing_minutes",
          message: `Lesson "${lesson.slug}" needs planned minutes greater than zero`,
          slug: lesson.slug,
        });
      }
    }
  }

  for (const lesson of manifest.lessons) {
    if (manifestBySlug.has(lesson.slug)) {
      errors.push({
        kind: "duplicate_manifest_slug",
        message: `Manifest contains duplicate lesson slug "${lesson.slug}"`,
        slug: lesson.slug,
      });
      continue;
    }
    manifestBySlug.set(lesson.slug, lesson);
  }

  for (const [slug, source] of sourceBySlug) {
    const contract = manifestBySlug.get(slug);
    if (!contract) {
      errors.push({
        kind: "missing_manifest_lesson",
        message: `Source lesson "${slug}" is missing from the inventory manifest`,
        slug,
      });
      continue;
    }

    const tierMapping = manifest.courses[source.courseSlug];
    if (!tierMapping) {
      errors.push({
        kind: "missing_tier_mapping",
        message: `Course "${source.courseSlug}" has no curriculum tier mapping`,
        courseSlug: source.courseSlug,
      });
      continue;
    }

    if (contract.toolBridge.kind === "simulator" && !contract.toolBridge.target.trim()) {
      errors.push({
        kind: "missing_tool_target",
        message: `Lesson "${slug}" has a simulator bridge without a target`,
        slug,
      });
    }
  }

  for (const slug of manifestBySlug.keys()) {
    if (!sourceBySlug.has(slug)) {
      errors.push({
        kind: "orphan_manifest_lesson",
        message: `Manifest lesson "${slug}" does not exist in source content`,
        slug,
      });
    }
  }

  if (errors.length > 0) return ResultFactory.err(errors);

  const lessons = [...sourceBySlug.values()]
    .map(({ courseSlug, lesson }) => {
      const contract = manifestBySlug.get(lesson.slug)!;
      return {
        slug: lesson.slug,
        title: lesson.title,
        courseSlug,
        tier: manifest.courses[courseSlug]!.tier,
        moduleNumber: lesson.moduleNumber,
        lessonNumber: lesson.lessonNumber,
        type: lesson.type,
        plannedMinutes: lesson.estimatedMinutes,
        xpReward: lesson.xpReward,
        toolBridge: contract.toolBridge,
        resourceRefs: contract.resourceRefs,
        finalDeliverable: contract.finalDeliverable,
        sourcePath: lesson.sourcePath,
      } satisfies CurriculumInventoryLesson;
    })
    .sort((a, b) => {
      if (a.moduleNumber !== b.moduleNumber) return a.moduleNumber - b.moduleNumber;
      return a.lessonNumber - b.lessonNumber;
    });

  return ResultFactory.ok({ schemaVersion: 1, lessons });
}

/** Returns the totals used by release checks and truthful programme claims. */
export function summarizeCurriculumInventory(
  inventory: CurriculumInventory,
): CurriculumInventorySummary {
  const lessonsByCourse: Record<string, number> = {};
  let totalPlannedMinutes = 0;
  let totalXp = 0;

  for (const lesson of inventory.lessons) {
    totalPlannedMinutes += lesson.plannedMinutes;
    totalXp += lesson.xpReward;
    lessonsByCourse[lesson.courseSlug] = (lessonsByCourse[lesson.courseSlug] ?? 0) + 1;
  }

  return {
    lessonCount: inventory.lessons.length,
    totalPlannedMinutes,
    totalXp,
    lessonsByCourse,
  };
}
