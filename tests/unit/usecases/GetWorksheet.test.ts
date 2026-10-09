/**
 * GetWorksheet use case tests — TDD (red first).
 *
 * STORY-130 / H2-anchored worksheet: read every per-H2 worksheet
 * value for one student in one lesson.
 */
import { describe, it, expect, vi } from "vitest";
import { GetWorksheet } from "@/usecases/GetWorksheet";
import { Result } from "@/domain/shared/Result";
import type { WorksheetFieldValue } from "@/domain/artifacts/worksheetEntry";
import type { IWorksheetRepository } from "@/ports/repositories/IWorksheetRepository";

const STUDENT_ID = "user_01";
const LESSON_SLUG = "1.1-read-ppc-data-before-you-change-it";

function makeRow(overrides: Partial<WorksheetFieldValue>): WorksheetFieldValue {
  return {
    studentId: STUDENT_ID,
    lessonSlug: LESSON_SLUG,
    h2Anchor: "what-the-numbers-actually-mean",
    fieldKey: "observation",
    value: "CTR dropped after the budget change.",
    updatedAt: new Date("2025-07-01T00:00:00Z"),
    ...overrides,
  } as WorksheetFieldValue;
}

function buildRepo(
  findByStudentAndLesson: IWorksheetRepository["findByStudentAndLesson"],
): IWorksheetRepository {
  return {
    findByStudentAndLesson,
    findByStudent: vi.fn(async () =>
      Result.ok([] as readonly WorksheetFieldValue[]),
    ) as IWorksheetRepository["findByStudent"],
    saveH2: vi.fn() as IWorksheetRepository["saveH2"],
  };
}

describe("GetWorksheet", () => {
  it("returns the repository rows for the student and lesson", async () => {
    const rows = [makeRow({}), makeRow({ fieldKey: "metricToWatchFirst", value: "CTR" })];
    const repo = buildRepo(
      vi.fn(async () => Result.ok(rows)) as IWorksheetRepository["findByStudentAndLesson"],
    );
    const result = await new GetWorksheet({ worksheetRepo: repo }).execute({
      studentId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(rows);
    expect(repo.findByStudentAndLesson).toHaveBeenCalledWith(STUDENT_ID, LESSON_SLUG);
  });

  it("returns an empty list when the student has not saved anything", async () => {
    const repo = buildRepo(
      vi.fn(async () =>
        Result.ok([] as readonly WorksheetFieldValue[]),
      ) as IWorksheetRepository["findByStudentAndLesson"],
    );
    const result = await new GetWorksheet({ worksheetRepo: repo }).execute({
      studentId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
    });
    expect(result).toEqual(Result.ok([] as readonly WorksheetFieldValue[]));
  });

  it("passes the db error through unchanged", async () => {
    const repo = buildRepo(
      vi.fn(async () =>
        Result.err({ kind: "db_error", message: "connection lost" }),
      ) as IWorksheetRepository["findByStudentAndLesson"],
    );
    const result = await new GetWorksheet({ worksheetRepo: repo }).execute({
      studentId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ kind: "db_error", message: "connection lost" });
  });
});
