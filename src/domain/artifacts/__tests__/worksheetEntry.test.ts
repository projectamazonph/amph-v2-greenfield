import { describe, expect, it } from "vitest";
import {
  WORKSHEET_FIELDS,
  WORKSHEET_LESSON_SLUGS,
  isWorksheetLessonSlug,
  validateWorksheetValues,
  WorksheetValidationError,
} from "@/domain/artifacts/worksheetEntry";

describe("worksheetEntry domain shape", () => {
  it("locks the inventory at 34 fields across the 5 lessons", () => {
    const all = Object.values(WORKSHEET_FIELDS).flat();
    expect(all).toHaveLength(34);
    // No duplicate keys across lessons (defensive: a rename shouldn't collide).
    expect(new Set(all).size).toBe(34);
  });

  it("declares the per-lesson field counts the story doc promises", () => {
    expect(WORKSHEET_FIELDS["1.1-read-ppc-data-before-you-change-it"]).toHaveLength(11);
    expect(WORKSHEET_FIELDS["1.2-cpc-ctr"]).toHaveLength(7);
    expect(WORKSHEET_FIELDS["1.3-acos-tacos-profitability"]).toHaveLength(6);
    expect(WORKSHEET_FIELDS["1.4-roas-measuring-return"]).toHaveLength(5);
    expect(WORKSHEET_FIELDS["1.5-metrics-in-practice"]).toHaveLength(5);
  });

  it("accepts the 5 lesson slugs and rejects unknowns", () => {
    for (const s of WORKSHEET_LESSON_SLUGS) {
      expect(isWorksheetLessonSlug(s)).toBe(true);
    }
    expect(isWorksheetLessonSlug("1.6-future-lesson")).toBe(false);
    expect(isWorksheetLessonSlug("")).toBe(false);
    expect(isWorksheetLessonSlug("1.1")).toBe(false);
  });

  it("validateWorksheetValues fills missing keys with empty strings", () => {
    const result = validateWorksheetValues("1.1-read-ppc-data-before-you-change-it", {
      productName: "Bamboo cutting board",
      price: "1250",
    });
    expect(result.productName).toBe("Bamboo cutting board");
    expect(result.price).toBe("1250");
    // Every other key is present with empty string.
    expect(result.campaignObjective).toBe("");
    expect(result.weeklyImpressions).toBe("");
    expect(result.firstQuestionToInvestigate).toBe("");
    // Result is a wide row, not a partial map.
    expect(Object.keys(result)).toHaveLength(11);
  });

  it("validateWorksheetValues rejects keys that are not in the lesson's allow-list", () => {
    expect(() =>
      validateWorksheetValues("1.2-cpc-ctr", {
        productCvr: "10",
        bogusKey: "nope",
        anotherBogus: "no",
      }),
    ).toThrow(WorksheetValidationError);
  });

  it("WorksheetValidationError surfaces the offending keys in order", () => {
    try {
      validateWorksheetValues("1.4-roas-measuring-return", {
        productProfitMargin: "30",
        inventedField: "x",
        alsoInvented: "y",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WorksheetValidationError);
      expect((err as WorksheetValidationError).invalidKeys).toEqual([
        "inventedField",
        "alsoInvented",
      ]);
      expect((err as Error).message).toContain("inventedField");
      expect((err as Error).message).toContain("alsoInvented");
    }
  });

  it("validateWorksheetValues accepts an empty map (the learner hasn't typed anything yet)", () => {
    const result = validateWorksheetValues("1.5-metrics-in-practice", {});
    expect(Object.keys(result)).toHaveLength(5);
    expect(result.weeklyPattern).toBe("");
    expect(result.nextReviewDate).toBe("");
  });
});
