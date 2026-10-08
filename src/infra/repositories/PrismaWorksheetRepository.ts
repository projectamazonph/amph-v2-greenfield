/**
 * PrismaWorksheetRepository — production adapter for IWorksheetRepository.
 *
 * Maps each (studentId, lessonSlug, h2Anchor, fieldKey) row to the
 * domain WorksheetFieldValue shape. Soft-deleted rows are filtered
 * out of every read so the renderer never sees a tombstoned entry;
 * the use case layer treats deletes as "not present".
 *
 * The saveH2 path is one transaction: delete the four-segment key
 * (cascade-delete isn't used because the spec says "upsert" and
 * fields can be empty strings, not absence), then insert. Doing this
 * in one transaction keeps a concurrent read from observing a
 * half-empty H2.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { WorksheetFieldValue } from "@/domain/artifacts/worksheetEntry";
import type {
  IWorksheetRepository,
  SaveH2Input,
  WorksheetQueryError,
  WorksheetSaveError,
} from "@/ports/repositories/IWorksheetRepository";

interface WorksheetRow {
  studentId: string;
  lessonSlug: string;
  h2Anchor: string;
  fieldKey: string;
  value: string;
  updatedAt: Date;
}

function mapRow(row: WorksheetRow): WorksheetFieldValue {
  return {
    studentId: row.studentId,
    lessonSlug: row.lessonSlug as WorksheetFieldValue["lessonSlug"],
    h2Anchor: row.h2Anchor,
    fieldKey: row.fieldKey,
    value: row.value,
    updatedAt: row.updatedAt,
  };
}

export class PrismaWorksheetRepository implements IWorksheetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByStudentAndLesson(
    studentId: string,
    lessonSlug: string,
  ): Promise<Result<readonly WorksheetFieldValue[], WorksheetQueryError>> {
    try {
      const rows = await this.prisma.worksheetEntry.findMany({
        where: { studentId, lessonSlug, deletedAt: null },
        select: {
          studentId: true,
          lessonSlug: true,
          h2Anchor: true,
          fieldKey: true,
          value: true,
          updatedAt: true,
        },
      });
      return Result.ok(rows.map(mapRow));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return Result.err({ kind: "db_error", message });
    }
  }

  async findByStudent(
    studentId: string,
  ): Promise<Result<readonly WorksheetFieldValue[], WorksheetQueryError>> {
    try {
      const rows = await this.prisma.worksheetEntry.findMany({
        where: { studentId, deletedAt: null },
        select: {
          studentId: true,
          lessonSlug: true,
          h2Anchor: true,
          fieldKey: true,
          value: true,
          updatedAt: true,
        },
      });
      return Result.ok(rows.map(mapRow));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return Result.err({ kind: "db_error", message });
    }
  }

  async saveH2(input: SaveH2Input): Promise<Result<void, WorksheetSaveError>> {
    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.worksheetEntry.deleteMany({
          where: {
            studentId: input.studentId,
            lessonSlug: input.lessonSlug,
            h2Anchor: input.h2Anchor,
          },
        });
        const entries = Object.entries(input.values).map(([fieldKey, value]) => ({
          studentId: input.studentId,
          lessonSlug: input.lessonSlug,
          h2Anchor: input.h2Anchor,
          fieldKey,
          value,
        }));
        if (entries.length > 0) {
          await tx.worksheetEntry.createMany({ data: entries });
        }
      });
      return Result.ok(undefined);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        return Result.err({ kind: "db_error", message: e.message });
      }
      const message = e instanceof Error ? e.message : String(e);
      return Result.err({ kind: "db_error", message });
    }
  }
}
