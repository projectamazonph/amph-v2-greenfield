/**
 * lessonPath — resolve a lesson slug to its course-relative URL.
 *
 * LEARN-050. The download center surfaces a small "Supports Lesson X"
 * chip per resource when the resource has an anchor lesson slug. Lesson
 * slugs follow the `WorksheetLessonSlug` shape (`-1.1-…`, `0.2-…`,
 * `1.2-…`, `4.3-…`, etc.), and the lesson route is `/courses/[slug]/
 * lessons/[lessonId]`. The course slug is derived from the module
 * number, matching the same mapping the seeder uses
 * (`scripts/seed-all-content.mjs` `courseSlugForModule`):
 *
 *   -1, 0, 1, 2, 3, 4           → ppc-foundations
 *    5, 6, 7, 8, 9, 10          → accelerated-mastery
 *   11                          → ultimate-transformation
 *
 * A slug that does not parse is treated as unowned and returns `null`.
 * Callers that want a chip with no link can render `slug` as plain
 * text; callers that want a link use the returned `path`.
 *
 * No DB or IO. Pure, side-effect-free, easy to unit test.
 */
const MODULE_TO_COURSE: ReadonlyArray<readonly [number, number, string]> = [
  [-1, 4, "ppc-foundations"],
  [5, 10, "accelerated-mastery"],
  [11, 11, "ultimate-transformation"],
];

export interface LessonPathResult {
  /** Root-relative path into the lesson route, or null when unowned. */
  readonly path: string | null;
  /** Course slug the lesson belongs to, or null when unowned. */
  readonly courseSlug: string | null;
}

/**
 * Parse the leading module number out of a lesson slug like `4.3-campaign-structure`
 * or `-1.2-surfaces`. Returns null when the slug does not start with a
 * recognisable `[-]digits` prefix.
 */
export function moduleNumberFromSlug(slug: string): number | null {
  // Match an optional leading minus, then digits up to the first dot.
  // `4.3-campaign-structure` → "4"; `-1.2-surfaces` → "-1".
  const match = /^(-?\d+)\./.exec(slug);
  if (!match) return null;
  const n = Number.parseInt(match[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

export function lessonPath(slug: string | null | undefined): LessonPathResult {
  if (!slug) return { path: null, courseSlug: null };
  const moduleNumber = moduleNumberFromSlug(slug);
  if (moduleNumber === null) return { path: null, courseSlug: null };
  for (const [lo, hi, courseSlug] of MODULE_TO_COURSE) {
    if (moduleNumber >= lo && moduleNumber <= hi) {
      return { path: `/courses/${courseSlug}/lessons/${slug}`, courseSlug };
    }
  }
  return { path: null, courseSlug: null };
}