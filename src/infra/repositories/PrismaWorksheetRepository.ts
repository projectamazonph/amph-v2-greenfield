/**
 * PrismaWorksheetRepository — production adapter for WorksheetRepository.
 *
 * STORY-163. Maps the wide-row WorksheetEntry table to the
 * WorksheetEntry domain shape. Reads filter on deletedAt IS NULL so soft-
 * deleted rows never surface to the learner (we don't expose an explicit
 * archive path yet). Writes upsert by (studentId, lessonSlug); the unique
 * constraint in the schema enforces "one row per (student, lesson)" at
 * the database level.
 *
 * Field flattening: the 34 nullable columns on the row collapse to a
 * WorksheetValues map. Missing DB columns (e.g. a freshly inserted row
 * before any save) come back as null; the mapping layer replaces null
 * with "" so the domain shape stays wide.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import {
  WORKSHEET_FIELDS,
  type WorksheetEntry,
  type WorksheetLessonSlug,
  type WorksheetValues,
  isWorksheetLessonSlug,
} from "@/domain/artifacts/worksheetEntry";
import type {
  UpsertWorksheetArgs,
  WorksheetError,
  WorksheetRepository,
} from "@/ports/repositories/WorksheetRepository";

interface WorksheetRow {
  id: string;
  studentId: string;
  lessonSlug: string;
  productName: string | null;
  price: string | null;
  campaignObjective: string | null;
  weeklyImpressions: string | null;
  weeklyClicks: string | null;
  weeklyAdSpend: string | null;
  weeklyOrders: string | null;
  weeklyAdSales: string | null;
  weeklyTotalSales: string | null;
  dataWindow: string | null;
  firstQuestionToInvestigate: string | null;
  productCvr: string | null;
  targetAcos: string | null;
  maxCpc: string | null;
  actualCpc: string | null;
  aboveOrBelowMax: string | null;
  weeklyCtr: string | null;
  firstCheckIfAboveMax: string | null;
  totalCostToSell: string | null;
  profitMarginBeforeAds: string | null;
  breakEvenAcos: string | null;
  weeklyActualAcos: string | null;
  profitOrLossPerAdSale: string | null;
  weeklyTacos: string | null;
  productProfitMargin: string | null;
  minimumRoas: string | null;
  targetRoasWithCushion: string | null;
  weeklyActualRoas: string | null;
  aboveOrBelowMinimum: string | null;
  weeklyPattern: string | null;
  bottleneckMetric: string | null;
  rootCauseToCheckFirst: string | null;
  oneActionThisWeek: string | null;
  nextReviewDate: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Flatten the row's 34 nullable columns into a wide WorksheetValues map.
 * Defensive: if the database ever returns a row whose lessonSlug is not
 * in the domain inventory, we still produce a map but only for the keys
 * that are in WORKSHEET_FIELDS[lessonSlug]. Anything not in the inventory
 * is dropped at the boundary, which keeps the domain shape pure.
 */
function flattenRow(row: WorksheetRow): WorksheetValues | null {
  if (!isWorksheetLessonSlug(row.lessonSlug)) return null;
  const fields = WORKSHEET_FIELDS[row.lessonSlug];
  const values: Record<string, string> = {};
  for (const key of fields) {
    const v = (row as unknown as Record<string, string | null>)[key];
    values[key] = typeof v === "string" ? v : "";
  }
  return values as WorksheetValues;
}

function mapRow(row: WorksheetRow): WorksheetEntry | null {
  const values = flattenRow(row);
  if (values === null) return null;
  return {
    studentId: row.studentId,
    lessonSlug: row.lessonSlug as WorksheetLessonSlug,
    values,
    updatedAt: row.updatedAt,
  };
}

/**
 * Build the Prisma create/update payload for a lesson's worth of fields.
 * Each key is mapped to the matching column; values that are not in the
 * lesson's allow-list are dropped before this point by
 * validateWorksheetValues.
 */
function buildData(args: UpsertWorksheetArgs, isCreate: boolean): Record<string, unknown> {
  const base: Record<string, unknown> = {
    studentId: args.studentId,
    lessonSlug: args.lessonSlug,
  };
  // values is a Record<string, string> after validateWorksheetValues; the
  // domain shape guarantees every key is a column name on the row.
  const valueRecord = args.values as unknown as Record<string, string>;
  for (const [k, v] of Object.entries(valueRecord)) {
    base[k] = v;
  }
  if (isCreate) {
    base.createdById = args.actorId;
    base.createdAt = args.updatedAt;
  }
  base.updatedById = args.actorId;
  base.updatedAt = args.updatedAt;
  return base;
}

export class PrismaWorksheetRepository implements WorksheetRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByStudent(
    studentId: string,
  ): Promise<Result<readonly WorksheetEntry[], WorksheetError>> {
    try {
      const rows = await this.db.worksheetEntry.findMany({
        where: { studentId, deletedAt: null },
      });
      const out: WorksheetEntry[] = [];
      for (const row of rows as unknown as WorksheetRow[]) {
        const entry = mapRow(row);
        if (entry !== null) out.push(entry);
      }
      return Result.ok(out);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async upsert(args: UpsertWorksheetArgs): Promise<Result<{ savedAt: Date }, WorksheetError>> {
    try {
      const row = await this.db.worksheetEntry.upsert({
        where: {
          studentId_lessonSlug: {
            studentId: args.studentId,
            lessonSlug: args.lessonSlug,
          },
        },
        create: buildData(args, true) as never,
        update: buildData(args, false) as never,
      });
      const updatedAt = (row as unknown as WorksheetRow).updatedAt;
      return Result.ok({ savedAt: updatedAt });
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}
