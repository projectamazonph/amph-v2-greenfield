/**
 * GetModule1WorksheetSummary — STORY-164 read view.
 *
 * Returns the rows a learner wrote across Lessons 1.1 through 1.5,
 * flattened into a single Module1RowSnapshot the read view can
 * render as one page. Also runs the three consistency checks
 * (maxCpc recap, breakEvenAcos vs margin, minimumRoas = 1/margin)
 * and returns the result alongside the snapshot.
 *
 * No actor check: the route layer enforces that callers can only
 * see their own rows. There is no admin read of student worksheet
 * data; this use case is student-self only.
 *
 * Fetches the 5 lessons in parallel with Promise.all so a slow
 * Prisma query on one lesson does not block the others. Each
 * fetch returns Result so a single failure becomes an error result
 * for the whole summary rather than a crash.
 */

import { Result } from "@/domain/shared/Result";
import type { WorksheetFieldValue, WorksheetLessonSlug } from "@/domain/artifacts/worksheetEntry";
import type { IWorksheetRepository, WorksheetQueryError } from "@/ports/repositories/IWorksheetRepository";
import {
  computeWorksheetConsistency,
  type Module1RowSnapshot,
  type WorksheetConsistencyResult,
} from "@/domain/artifacts/worksheetConsistency";

/**
 * The five Module 1 lessons that feed the read view. Order
 * matters: the read view renders them in this order. The list
 * is intentionally hard-coded rather than read from the
 * curriculum inventory so a missing worksheet in one lesson
 * surfaces as a UI gap rather than a silent skip.
 */
export const MODULE1_LESSON_SLUGS = [
  "1.1-read-ppc-data-before-you-change-it",
  "1.2-cpc-ctr",
  "1.3-acos-tacos-profitability",
  "1.4-roas-measuring-return",
  "1.5-metrics-in-practice",
] as const satisfies readonly WorksheetLessonSlug[];

export interface Module1LessonSnapshot {
  readonly lessonSlug: WorksheetLessonSlug;
  readonly rows: readonly WorksheetFieldValue[];
  /**
   * True if the lesson has at least one saved value. The renderer
   * uses this to dim empty sections rather than hide them, so
   * a learner who has only filled in 1.1-1.3 still sees the
   * missing-lesson state.
   */
  readonly hasData: boolean;
}

export interface Module1WorksheetSummary {
  readonly lessons: readonly Module1LessonSnapshot[];
  readonly snapshot: Module1RowSnapshot;
  readonly consistency: WorksheetConsistencyResult;
}

export type Module1SummaryError = WorksheetQueryError;

export type GetModule1SummaryResult = Result<
  Module1WorksheetSummary,
  Module1SummaryError
>;

export interface GetModule1SummaryDeps {
  readonly worksheetRepo: IWorksheetRepository;
}

export class GetModule1WorksheetSummary {
  constructor(private readonly deps: GetModule1SummaryDeps) {}

  async execute(input: { readonly studentId: string }): Promise<GetModule1SummaryResult> {
    const results = await Promise.all(
      MODULE1_LESSON_SLUGS.map((slug) =>
        this.deps.worksheetRepo.findByStudentAndLesson(input.studentId, slug),
      ),
    );

    // If any lesson fetch failed, surface the first error. We do
    // not merge because a partial summary would mislead the learner
    // into thinking their saved values are incomplete when the
    // real problem is a DB read.
    for (const result of results) {
      if (!result.ok) {
        return result;
      }
    }

    const lessons: Module1LessonSnapshot[] = results.map((result, i) => {
      const rows = result.ok ? result.value : [];
      // The index is bounded by MODULE1_LESSON_SLUGS.length so the
      // lookup is total; the cast is a noUncheckedIndexedAccess escape.
      const lessonSlug = MODULE1_LESSON_SLUGS[i] as (typeof MODULE1_LESSON_SLUGS)[number];
      return {
        lessonSlug,
        rows,
        hasData: rows.length > 0,
      };
    });

    const snapshot = snapshotFromLessons(lessons);
    const consistency = computeWorksheetConsistency(snapshot);

    return Result.ok({ lessons, snapshot, consistency });
  }
}

/**
 * Reduce the per-lesson field rows down to the single flat
 * snapshot the consistency check and the renderer both expect.
 * Later values for the same field win; the lesson order is the
 * tiebreaker so 1.5 (the recap) overrides 1.2 (the source) when
 * the same field key happens to be reused.
 */
function snapshotFromLessons(
  lessons: readonly Module1LessonSnapshot[],
): Module1RowSnapshot {
  const out: Record<string, string> = {};
  for (const lesson of lessons) {
    for (const row of lesson.rows) {
      out[row.fieldKey] = row.value;
    }
  }
  return {
    weeklyImpressions: out.weeklyImpressions ?? "",
    weeklyClicks: out.weeklyClicks ?? "",
    weeklyAdSpend: out.weeklyAdSpend ?? "",
    weeklyAdSales: out.weeklyAdSales ?? "",
    weeklyTotalSales: out.weeklyTotalSales ?? "",
    productCvr: out.productCvr ?? "",
    targetAcos: out.targetAcos ?? "",
    maxCpc: out.maxCpc ?? "",
    weeklyActualAcos: out.weeklyActualAcos ?? "",
    profitMarginBeforeAds: out.profitMarginBeforeAds ?? "",
    weeklyTacos: out.weeklyTacos ?? "",
    breakEvenAcos: out.breakEvenAcos ?? "",
    productProfitMargin: out.productProfitMargin ?? "",
    minimumRoas: out.minimumRoas ?? "",
    maxCpcRecap: out.maxCpcRecap ?? "",
  };
}
