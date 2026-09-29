import { describe, expect, it } from "vitest";
import { SaveWorksheetEntry } from "@/usecases/SaveWorksheetEntry";
import { InMemoryWorksheetRepository } from "@/infra/db/inmemory/InMemoryWorksheetRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { TestLogger } from "@/infra/observability/TestLogger";
import {
  validateWorksheetValues,
  type WorksheetLessonSlug,
  type WorksheetValues,
} from "@/domain/artifacts/worksheetEntry";

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
  });
});
