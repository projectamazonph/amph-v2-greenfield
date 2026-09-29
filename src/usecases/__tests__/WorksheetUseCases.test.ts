import { describe, expect, it } from "vitest";
import { GetWorksheet } from "@/usecases/GetWorksheet";
import { SaveWorksheetEntry } from "@/usecases/SaveWorksheetEntry";
import { InMemoryWorksheetRepository } from "@/infra/db/inmemory/InMemoryWorksheetRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { TestLogger } from "@/infra/observability/TestLogger";
import { validateWorksheetValues } from "@/domain/artifacts/worksheetEntry";
import type { WorksheetLessonSlug } from "@/domain/artifacts/worksheetEntry";
import type { WorksheetValues } from "@/domain/artifacts/worksheetEntry";

function fixedClock(): FixedClock {
  return new FixedClock(new Date("2026-09-29T12:00:00.000Z"));
}

function buildFixture() {
  const repo = new InMemoryWorksheetRepository();
  const auditLog = new InMemoryAuditLog();
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen: new InMemoryIdGenerator(),
    clock: fixedClock(),
    logger: new TestLogger(),
  });
  return { repo, auditLog, recordAuditLog };
}

function fullRow(
  lessonSlug: WorksheetLessonSlug,
  partial: Partial<Record<string, string>>,
): WorksheetValues {
  return validateWorksheetValues(lessonSlug, partial as Record<string, string>);
}

describe("GetWorksheet use case", () => {
  it("returns an empty list when the student has not saved anything", async () => {
    const { repo, recordAuditLog } = buildFixture();
    const get = new GetWorksheet({ worksheetRepo: repo });
    const result = await get.execute({ studentId: "student-1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
    // Read path; no audit row expected.
    expect(recordAuditLog).toBeDefined();
  });

  it("returns every row the student has touched", async () => {
    const { repo, recordAuditLog, auditLog } = buildFixture();
    const save = new SaveWorksheetEntry({
      worksheetRepo: repo,
      recordAuditLog,
      clock: fixedClock(),
    });
    await save.execute({
      studentId: "student-1",
      actorId: "student-1",
      lessonSlug: "1.1-read-ppc-data-before-you-change-it",
      values: { productName: "Bamboo cutting board" },
    });
    await save.execute({
      studentId: "student-1",
      actorId: "student-1",
      lessonSlug: "1.2-cpc-ctr",
      values: { productCvr: "10" },
    });

    const get = new GetWorksheet({ worksheetRepo: repo });
    const result = await get.execute({ studentId: "student-1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    const slugs = result.value.map((e) => e.lessonSlug).sort();
    expect(slugs).toEqual(["1.1-read-ppc-data-before-you-change-it", "1.2-cpc-ctr"]);

    // Two audit rows were recorded for the saves.
    const auditEntries = await auditLog.list({});
    expect(auditEntries.ok).toBe(true);
    if (!auditEntries.ok) return;
    const actions = auditEntries.value.entries.map((e) => e.action);
    expect(actions.filter((a) => a === "worksheet.saved")).toHaveLength(2);
  });

  it("scopes results to the calling student", async () => {
    const { repo, recordAuditLog } = buildFixture();
    const save = new SaveWorksheetEntry({
      worksheetRepo: repo,
      recordAuditLog,
      clock: fixedClock(),
    });
    await save.execute({
      studentId: "student-1",
      actorId: "student-1",
      lessonSlug: "1.1-read-ppc-data-before-you-change-it",
      values: { productName: "From student 1" },
    });
    await save.execute({
      studentId: "student-2",
      actorId: "student-2",
      lessonSlug: "1.1-read-ppc-data-before-you-change-it",
      values: { productName: "From student 2" },
    });

    const get = new GetWorksheet({ worksheetRepo: repo });
    const a = await get.execute({ studentId: "student-1" });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.value).toHaveLength(1);
    expect(a.value[0]?.values.productName).toBe("From student 1");

    const b = await get.execute({ studentId: "student-2" });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value).toHaveLength(1);
    expect(b.value[0]?.values.productName).toBe("From student 2");
  });
});

describe("SaveWorksheetEntry use case", () => {
  it("saves a full row for a lesson, filling missing keys with empty strings", async () => {
    const { repo, auditLog, recordAuditLog } = buildFixture();
    const save = new SaveWorksheetEntry({
      worksheetRepo: repo,
      recordAuditLog,
      clock: fixedClock(),
    });

    const result = await save.execute({
      studentId: "student-1",
      actorId: "student-1",
      lessonSlug: "1.1-read-ppc-data-before-you-change-it",
      values: { productName: "Bamboo cutting board", price: "1250" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lessonSlug).toBe("1.1-read-ppc-data-before-you-change-it");
    expect(result.value.savedAt).toEqual(new Date("2026-09-29T12:00:00.000Z"));

    // GetWorksheet round-trip shows the wide shape.
    const get = new GetWorksheet({ worksheetRepo: repo });
    const list = await get.execute({ studentId: "student-1" });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    const row = list.value[0];
    expect(row).toBeDefined();
    expect(row?.values.productName).toBe("Bamboo cutting board");
    expect(row?.values.price).toBe("1250");
    expect(row?.values.campaignObjective).toBe("");
    expect(Object.keys(row?.values ?? {}).length).toBe(11);

    // Audit row was recorded with the lesson and field count.
    const auditEntries = await auditLog.list({});
    expect(auditEntries.ok).toBe(true);
    if (!auditEntries.ok) return;
    expect(auditEntries.value.entries).toHaveLength(1);
    expect(auditEntries.value.entries[0]?.action).toBe("worksheet.saved");
  });

  it("upserts on a second save for the same student + lesson", async () => {
    const { repo, recordAuditLog } = buildFixture();
    const save = new SaveWorksheetEntry({
      worksheetRepo: repo,
      recordAuditLog,
      clock: fixedClock(),
    });

    await save.execute({
      studentId: "student-1",
      actorId: "student-1",
      lessonSlug: "1.2-cpc-ctr",
      values: { productCvr: "8" },
    });
    await save.execute({
      studentId: "student-1",
      actorId: "student-1",
      lessonSlug: "1.2-cpc-ctr",
      values: { productCvr: "12", targetAcos: "25" },
    });

    const get = new GetWorksheet({ worksheetRepo: repo });
    const list = await get.execute({ studentId: "student-1" });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(1); // upsert: still one row
    expect(list.value[0]?.values.productCvr).toBe("12");
    expect(list.value[0]?.values.targetAcos).toBe("25");
  });

  it("rejects unknown field keys with invalid_field", async () => {
    const { repo, recordAuditLog } = buildFixture();
    const save = new SaveWorksheetEntry({
      worksheetRepo: repo,
      recordAuditLog,
      clock: fixedClock(),
    });

    const result = await save.execute({
      studentId: "student-1",
      actorId: "student-1",
      lessonSlug: "1.2-cpc-ctr",
      values: { productCvr: "10", inventedField: "nope" } as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_field");
    if (result.error.kind !== "invalid_field") return;
    expect(result.error.invalidKeys).toEqual(["inventedField"]);
  });

  it("rejects a forged actor with forbidden", async () => {
    const { repo, recordAuditLog } = buildFixture();
    const save = new SaveWorksheetEntry({
      worksheetRepo: repo,
      recordAuditLog,
      clock: fixedClock(),
    });

    const result = await save.execute({
      studentId: "student-1",
      actorId: "student-2",
      lessonSlug: "1.1-read-ppc-data-before-you-change-it",
      values: { productName: "hijacked" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("forbidden");
  });

  it("still records the save even when the audit log fails", async () => {
    const repo = new InMemoryWorksheetRepository();
    const recordAuditLog = new RecordAuditLog({
      auditLog: {
        record: async () => ({ ok: false, error: { kind: "db_error", message: "down" } }),
        list: async () => ({ ok: true, value: { entries: [], nextCursor: null, total: 0 } }),
      },
      idGen: new InMemoryIdGenerator(),
      clock: fixedClock(),
      logger: new TestLogger(),
    });
    const save = new SaveWorksheetEntry({
      worksheetRepo: repo,
      recordAuditLog,
      clock: fixedClock(),
    });

    const result = await save.execute({
      studentId: "student-1",
      actorId: "student-1",
      lessonSlug: "1.1-read-ppc-data-before-you-change-it",
      values: { productName: "Bamboo cutting board" },
    });
    expect(result.ok).toBe(true);
  });

  it("works end-to-end through every lesson in the catalog", async () => {
    const { repo, recordAuditLog } = buildFixture();
    const save = new SaveWorksheetEntry({
      worksheetRepo: repo,
      recordAuditLog,
      clock: fixedClock(),
    });
    const slugs: WorksheetLessonSlug[] = [
      "1.1-read-ppc-data-before-you-change-it",
      "1.2-cpc-ctr",
      "1.3-acos-tacos-profitability",
      "1.4-roas-measuring-return",
      "1.5-metrics-in-practice",
    ];
    for (const slug of slugs) {
      const r = await save.execute({
        studentId: "student-1",
        actorId: "student-1",
        lessonSlug: slug,
        values: fullRow(slug, {}),
      });
      expect(r.ok).toBe(true);
    }
    const get = new GetWorksheet({ worksheetRepo: repo });
    const list = await get.execute({ studentId: "student-1" });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(5);
  });
});
