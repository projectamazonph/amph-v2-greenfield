/**
 * SaveWorksheetH2 use case tests — TDD (red first).
 *
 * STORY-130 / H2-anchored worksheet: student persists the full H2
 * (all field keys) for one (lessonSlug, h2Anchor).
 */
import { describe, it, expect, vi } from "vitest";
import { SaveWorksheetH2 } from "@/usecases/SaveWorksheetH2";
import { Result } from "@/domain/shared/Result";
import type { IWorksheetRepository } from "@/ports/repositories/IWorksheetRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

const STUDENT_ID = "user_01";
const LESSON_SLUG = "1.1-read-ppc-data-before-you-change-it";
const H2_ANCHOR = "what-the-numbers-actually-mean";

function buildRepo(saveH2: IWorksheetRepository["saveH2"]): IWorksheetRepository {
  return {
    saveH2,
    findByStudentAndLesson: vi.fn() as IWorksheetRepository["findByStudentAndLesson"],
    findByStudent: vi.fn() as IWorksheetRepository["findByStudent"],
  };
}

function buildAuditLog(): RecordAuditLog & { execute: ReturnType<typeof vi.fn> } {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: vi.fn(async () => Result.ok(undefined)) as any,
  } as RecordAuditLog & { execute: ReturnType<typeof vi.fn> };
}

function buildUseCase(repo: IWorksheetRepository, auditLog: RecordAuditLog) {
  return new SaveWorksheetH2({ worksheetRepo: repo, recordAuditLog: auditLog });
}

describe("SaveWorksheetH2", () => {
  it("saves the normalized full-H2 map and audits worksheet.saved", async () => {
    const saveH2 = vi.fn(async () => Result.ok(undefined)) as IWorksheetRepository["saveH2"];
    const auditLog = buildAuditLog();
    const result = await buildUseCase(buildRepo(saveH2), auditLog).execute({
      studentId: STUDENT_ID,
      actorId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
      h2Anchor: H2_ANCHOR,
      values: { observation: "CTR dropped.", metricToWatchFirst: "CTR" },
    });
    expect(result.ok).toBe(true);
    expect(saveH2).toHaveBeenCalledWith({
      studentId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
      h2Anchor: H2_ANCHOR,
      values: { observation: "CTR dropped.", metricToWatchFirst: "CTR" },
    });
    expect(auditLog.execute).toHaveBeenCalledWith(
      expect.objectContaining({ action: "worksheet.saved" }),
    );
  });

  it("fills missing field keys with empty strings before the port write", async () => {
    const saveH2 = vi.fn(async () => Result.ok(undefined)) as IWorksheetRepository["saveH2"];
    const result = await buildUseCase(buildRepo(saveH2), buildAuditLog()).execute({
      studentId: STUDENT_ID,
      actorId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
      h2Anchor: H2_ANCHOR,
      values: { observation: "Only one field." },
    });
    expect(result.ok).toBe(true);
    expect(saveH2).toHaveBeenCalledWith(
      expect.objectContaining({
        values: { observation: "Only one field.", metricToWatchFirst: "" },
      }),
    );
  });

  it("rejects an actor saving another student's rows", async () => {
    const saveH2 = vi.fn() as IWorksheetRepository["saveH2"];
    const auditLog = buildAuditLog();
    const result = await buildUseCase(buildRepo(saveH2), auditLog).execute({
      studentId: STUDENT_ID,
      actorId: "user_02",
      lessonSlug: LESSON_SLUG,
      h2Anchor: H2_ANCHOR,
      values: { observation: "x" },
    });
    expect(result).toEqual(Result.err({ kind: "forbidden_actor" }));
    expect(saveH2).not.toHaveBeenCalled();
    expect(auditLog.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "worksheet.save_failed",
        metadata: { outcome: "forbidden_actor" },
      }),
    );
  });

  it("rejects an unregistered lesson slug", async () => {
    const saveH2 = vi.fn() as IWorksheetRepository["saveH2"];
    const result = await buildUseCase(buildRepo(saveH2), buildAuditLog()).execute({
      studentId: STUDENT_ID,
      actorId: STUDENT_ID,
      lessonSlug: "not-a-lesson",
      h2Anchor: H2_ANCHOR,
      values: { observation: "x" },
    });
    expect(result).toEqual(Result.err({ kind: "invalid_lesson_slug" }));
    expect(saveH2).not.toHaveBeenCalled();
  });

  it("rejects an H2 anchor that is not in the lesson spec", async () => {
    const saveH2 = vi.fn() as IWorksheetRepository["saveH2"];
    const result = await buildUseCase(buildRepo(saveH2), buildAuditLog()).execute({
      studentId: STUDENT_ID,
      actorId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
      h2Anchor: "not-a-real-anchor",
      values: { observation: "x" },
    });
    expect(result).toEqual(Result.err({ kind: "invalid_h2_anchor" }));
    expect(saveH2).not.toHaveBeenCalled();
  });

  it("rejects unknown field keys and reports them", async () => {
    const saveH2 = vi.fn() as IWorksheetRepository["saveH2"];
    const result = await buildUseCase(buildRepo(saveH2), buildAuditLog()).execute({
      studentId: STUDENT_ID,
      actorId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
      h2Anchor: H2_ANCHOR,
      values: { nonsenseKey: "x" },
    });
    expect(result).toEqual(Result.err({ kind: "invalid_keys", invalidKeys: ["nonsenseKey"] }));
    expect(saveH2).not.toHaveBeenCalled();
  });

  it("passes a repository db error through and audits the failure", async () => {
    const saveH2 = vi.fn(async () =>
      Result.err({ kind: "db_error", message: "connection lost" }),
    ) as IWorksheetRepository["saveH2"];
    const auditLog = buildAuditLog();
    const result = await buildUseCase(buildRepo(saveH2), auditLog).execute({
      studentId: STUDENT_ID,
      actorId: STUDENT_ID,
      lessonSlug: LESSON_SLUG,
      h2Anchor: H2_ANCHOR,
      values: { observation: "x" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ kind: "db_error", message: "connection lost" });
    expect(auditLog.execute).toHaveBeenCalledWith(
      expect.objectContaining({ action: "worksheet.save_failed" }),
    );
  });
});
