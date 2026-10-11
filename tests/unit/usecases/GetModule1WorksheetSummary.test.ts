/**
 * GetModule1WorksheetSummary — STORY-164 read view use case tests.
 *
 * Wraps 5 parallel calls to IWorksheetRepository.findByStudentAndLesson
 * (one per Module 1 lesson) and reduces them to a single flat snapshot
 * + consistency result.
 */
import { describe, it, expect, vi } from "vitest";
import { GetModule1WorksheetSummary } from "@/usecases/GetModule1WorksheetSummary";
import { Result } from "@/domain/shared/Result";
import type { WorksheetFieldValue } from "@/domain/artifacts/worksheetEntry";
import type { IWorksheetRepository } from "@/ports/repositories/IWorksheetRepository";

const STUDENT_ID = "user_01";

function makeRow(
  overrides: Partial<WorksheetFieldValue>,
): WorksheetFieldValue {
  return {
    studentId: STUDENT_ID,
    lessonSlug: "1.1-read-ppc-data-before-you-change-it",
    h2Anchor: "what-the-numbers-actually-mean",
    fieldKey: "observation",
    value: "",
    updatedAt: new Date("2025-07-01T00:00:00Z"),
    ...overrides,
  } as WorksheetFieldValue;
}

function buildRepo(
  rowsByLesson: Partial<Record<string, readonly WorksheetFieldValue[]>>,
  fetchError?: { lesson: string; message: string },
): IWorksheetRepository {
  return {
    findByStudentAndLesson: vi.fn(
      async (_studentId: string, lessonSlug: string) => {
        if (fetchError && fetchError.lesson === lessonSlug) {
          return Result.err({ kind: "db_error", message: fetchError.message });
        }
        return Result.ok(rowsByLesson[lessonSlug] ?? []);
      },
    ) as IWorksheetRepository["findByStudentAndLesson"],
    findByStudent: vi.fn(async () =>
      Result.ok([] as readonly WorksheetFieldValue[]),
    ) as IWorksheetRepository["findByStudent"],
    saveH2: vi.fn() as IWorksheetRepository["saveH2"],
  };
}

describe("GetModule1WorksheetSummary", () => {
  it("fetches all five Module 1 lessons in parallel", async () => {
    const repo = buildRepo({});
    const useCase = new GetModule1WorksheetSummary({ worksheetRepo: repo });

    const result = await useCase.execute({ studentId: STUDENT_ID });
    expect(result.ok).toBe(true);
    expect(repo.findByStudentAndLesson).toHaveBeenCalledTimes(5);
  });

  it("returns a snapshot of all Module 1 worksheet fields, empty when no data saved", async () => {
    const repo = buildRepo({});
    const useCase = new GetModule1WorksheetSummary({ worksheetRepo: repo });

    const result = await useCase.execute({ studentId: STUDENT_ID });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.snapshot.maxCpc).toBe("");
    expect(result.value.snapshot.weeklyImpressions).toBe("");
    expect(result.value.lessons).toHaveLength(5);
  });

  it("marks a lesson as hasData when it has at least one saved row", async () => {
    const repo = buildRepo({
      "1.2-cpc-ctr": [makeRow({ lessonSlug: "1.2-cpc-ctr", fieldKey: "maxCpc", value: "1.20" })],
    });
    const useCase = new GetModule1WorksheetSummary({ worksheetRepo: repo });

    const result = await useCase.execute({ studentId: STUDENT_ID });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lesson2 = result.value.lessons.find((l) => l.lessonSlug === "1.2-cpc-ctr");
    expect(lesson2?.hasData).toBe(true);
    const lesson5 = result.value.lessons.find((l) => l.lessonSlug === "1.5-metrics-in-practice");
    expect(lesson5?.hasData).toBe(false);
  });

  it("flattens all 5 lessons' rows into a single snapshot", async () => {
    const repo = buildRepo({
      "1.1-read-ppc-data-before-you-change-it": [
        makeRow({
          lessonSlug: "1.1-read-ppc-data-before-you-change-it",
          fieldKey: "weeklyAdSpend",
          value: "500",
        }),
      ],
      "1.2-cpc-ctr": [
        makeRow({ lessonSlug: "1.2-cpc-ctr", fieldKey: "maxCpc", value: "1.20" }),
        makeRow({ lessonSlug: "1.2-cpc-ctr", fieldKey: "productCvr", value: "0.15" }),
      ],
      "1.3-acos-tacos-profitability": [
        makeRow({
          lessonSlug: "1.3-acos-tacos-profitability",
          fieldKey: "profitMarginBeforeAds",
          value: "0.40",
        }),
      ],
      "1.4-roas-measuring-return": [
        makeRow({
          lessonSlug: "1.4-roas-measuring-return",
          fieldKey: "minimumRoas",
          value: "2.50",
        }),
      ],
      "1.5-metrics-in-practice": [
        makeRow({
          lessonSlug: "1.5-metrics-in-practice",
          fieldKey: "maxCpcRecap",
          value: "1.20",
        }),
      ],
    });
    const useCase = new GetModule1WorksheetSummary({ worksheetRepo: repo });

    const result = await useCase.execute({ studentId: STUDENT_ID });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.snapshot.weeklyAdSpend).toBe("500");
    expect(result.value.snapshot.maxCpc).toBe("1.20");
    expect(result.value.snapshot.profitMarginBeforeAds).toBe("0.40");
    expect(result.value.snapshot.minimumRoas).toBe("2.50");
    expect(result.value.snapshot.maxCpcRecap).toBe("1.20");
  });

  it("includes a consistency result alongside the snapshot", async () => {
    const repo = buildRepo({
      "1.2-cpc-ctr": [makeRow({ lessonSlug: "1.2-cpc-ctr", fieldKey: "maxCpc", value: "1.20" })],
      "1.5-metrics-in-practice": [
        makeRow({
          lessonSlug: "1.5-metrics-in-practice",
          fieldKey: "maxCpcRecap",
          value: "0.95",
        }),
      ],
    });
    const useCase = new GetModule1WorksheetSummary({ worksheetRepo: repo });

    const result = await useCase.execute({ studentId: STUDENT_ID });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.consistency.maxCpcRecap.status).toBe("drift");
  });

  it("returns the first db_error when any lesson fetch fails", async () => {
    const repo = buildRepo({}, { lesson: "1.3-acos-tacos-profitability", message: "boom" });
    const useCase = new GetModule1WorksheetSummary({ worksheetRepo: repo });

    const result = await useCase.execute({ studentId: STUDENT_ID });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});
