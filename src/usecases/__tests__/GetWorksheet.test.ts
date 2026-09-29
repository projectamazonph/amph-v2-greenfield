import { describe, expect, it } from "vitest";
import { GetWorksheet } from "@/usecases/GetWorksheet";
import { SaveWorksheetEntry } from "@/usecases/SaveWorksheetEntry";
import { InMemoryWorksheetRepository } from "@/infra/db/inmemory/InMemoryWorksheetRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { TestLogger } from "@/infra/observability/TestLogger";

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

describe("GetWorksheet use case", () => {
  it("returns an empty list when the student has not saved anything", async () => {
    const { repo } = buildFixture();
    const get = new GetWorksheet({ worksheetRepo: repo });
    const result = await get.execute({ studentId: "student-1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it("returns every row the student has touched", async () => {
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
  });
});
