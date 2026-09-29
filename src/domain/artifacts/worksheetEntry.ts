/**
 * STORY-163. Domain shape for the Module 1 worksheet artifact.
 *
 * One row per (studentId, lessonSlug), with 34 nullable string columns on the
 * Prisma side (11 + 7 + 6 + 5 + 5 across Lessons 1.1 through 1.5). The
 * field inventory is frozen by the curriculum polish work; widening to 34
 * was a measurement, not a drift. A new field is a new column.
 *
 * Lesson slugs match the MDX file names minus the leading "1.X-" prefix.
 * The validator in scripts/validate-lesson-production.ts and the regression
 * test in src/domain/curriculum/__tests__/WorksheetBlocks.test.ts both
 * treat these slugs as the source of truth for which lessons carry the
 * directive.
 *
 * Save semantics: the React side holds local state and saves the full row
 * of values on blur via the saveWorksheetEntry server action. Validation
 * rejects unknown field keys; missing keys fill in with "" so the row is
 * always wide.
 */

export const WORKSHEET_LESSON_SLUGS = [
  "1.1-read-ppc-data-before-you-change-it",
  "1.2-cpc-ctr",
  "1.3-acos-tacos-profitability",
  "1.4-roas-measuring-return",
  "1.5-metrics-in-practice",
] as const;
export type WorksheetLessonSlug = (typeof WORKSHEET_LESSON_SLUGS)[number];

export const WORKSHEET_FIELDS: Readonly<Record<WorksheetLessonSlug, readonly string[]>> = {
  "1.1-read-ppc-data-before-you-change-it": [
    "productName",
    "price",
    "campaignObjective",
    "weeklyImpressions",
    "weeklyClicks",
    "weeklyAdSpend",
    "weeklyOrders",
    "weeklyAdSales",
    "weeklyTotalSales",
    "dataWindow",
    "firstQuestionToInvestigate",
  ],
  "1.2-cpc-ctr": [
    "productCvr",
    "targetAcos",
    "maxCpc",
    "actualCpc",
    "aboveOrBelowMax",
    "weeklyCtr",
    "firstCheckIfAboveMax",
  ],
  "1.3-acos-tacos-profitability": [
    "totalCostToSell",
    "profitMarginBeforeAds",
    "breakEvenAcos",
    "weeklyActualAcos",
    "profitOrLossPerAdSale",
    "weeklyTacos",
  ],
  "1.4-roas-measuring-return": [
    "productProfitMargin",
    "minimumRoas",
    "targetRoasWithCushion",
    "weeklyActualRoas",
    "aboveOrBelowMinimum",
  ],
  "1.5-metrics-in-practice": [
    "weeklyPattern",
    "bottleneckMetric",
    "rootCauseToCheckFirst",
    "oneActionThisWeek",
    "nextReviewDate",
  ],
} as const;

export type WorksheetFieldKey = (typeof WORKSHEET_FIELDS)[WorksheetLessonSlug][number];

export type WorksheetValues = Readonly<Record<WorksheetFieldKey, string>>;

export interface WorksheetEntry {
  readonly studentId: string;
  readonly lessonSlug: WorksheetLessonSlug;
  readonly values: WorksheetValues;
  readonly updatedAt: Date;
}

export function isWorksheetLessonSlug(s: string): s is WorksheetLessonSlug {
  return (WORKSHEET_LESSON_SLUGS as readonly string[]).includes(s);
}

/**
 * Normalize a partial input map into the full wide-row shape required by the
 * Prisma schema. Missing keys fill in with ""; unknown keys throw
 * WorksheetValidationError so the use case can return Result.err.
 *
 * Throwing here (rather than returning Result) keeps the function a pure
 * shape helper; the use case layer wraps the throw in Result.err.
 */
export function validateWorksheetValues(
  lessonSlug: WorksheetLessonSlug,
  values: Readonly<Record<string, string>>,
): WorksheetValues {
  const allowed = WORKSHEET_FIELDS[lessonSlug];
  const allowedSet = new Set<string>(allowed);
  const invalid: string[] = [];
  for (const k of Object.keys(values)) {
    if (!allowedSet.has(k)) invalid.push(k);
  }
  if (invalid.length > 0) throw new WorksheetValidationError(invalid);
  const out: Record<string, string> = {};
  for (const k of allowed) out[k] = values[k] ?? "";
  return out as WorksheetValues;
}

export class WorksheetValidationError extends Error {
  constructor(public readonly invalidKeys: readonly string[]) {
    super(`unknown worksheet field keys: ${invalidKeys.join(", ")}`);
    this.name = "WorksheetValidationError";
  }
}
