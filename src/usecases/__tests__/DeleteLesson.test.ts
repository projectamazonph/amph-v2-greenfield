/**
 * DeleteLesson.test.ts — STORY-048c.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeleteLesson } from "@/usecases/DeleteLesson";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { createLesson, type Lesson } from "@/domain/entities/Lesson";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";

async function seedLesson(
  repo: InMemoryLessonRepository,
  overrides: Partial<Lesson> = {},
): Promise<Lesson> {
  const r = createLesson({
    id: "l1",
    moduleId: "mod_01",
    title: "Test",
    type: "TEXT",
    content: { body: "hi" },
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  await repo.create(r.value);
  return r.value;
}

function makeRecordAuditLog(): RecordAuditLog {
  return new RecordAuditLog({
    auditLog: new InMemoryAuditLog(),
    idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date()),
  });
}

describe("DeleteLesson", () => {
  let lessonRepo: InMemoryLessonRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: DeleteLesson;

  beforeEach(() => {
    lessonRepo = new InMemoryLessonRepository();
    recordAuditLog = makeRecordAuditLog();
    useCase = new DeleteLesson({ lessonRepo, recordAuditLog });
  });

  it("deletes the lesson on the happy path", async () => {
    await seedLesson(lessonRepo);

    const r = await useCase.execute({ lessonId: "l1", actorId: "admin_1" });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.deleted).toBe(true);

    const find = await lessonRepo.findById("l1");
    expect(find.ok).toBe(false);
  });

  it("returns lesson_not_found when the id doesn't exist", async () => {
    const r = await useCase.execute({ lessonId: "missing", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("lesson_not_found");
  });

  it("does not affect other lessons in the same module", async () => {
    await seedLesson(lessonRepo, { id: "l1", displayOrder: 1 });
    await seedLesson(lessonRepo, { id: "l2", displayOrder: 2 });

    await useCase.execute({ lessonId: "l1", actorId: "admin_1" });

    const list = await lessonRepo.findByModuleId("mod_01");
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.map((l) => l.id)).toEqual(["l2"]);
  });

  it("returns db_error when the repo errors", async () => {
    lessonRepo.delete = async () => ({
      ok: false,
      error: { kind: "db_error", message: "delete failed" },
    });

    const r = await useCase.execute({ lessonId: "l1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("records an audit log entry on success", async () => {
    await seedLesson(lessonRepo);
    await useCase.execute({ lessonId: "l1", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "lesson.deleted")).toBe(true);
  });

  it("records an audit log entry on failure", async () => {
    await useCase.execute({ lessonId: "missing", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "lesson.delete_failed")).toBe(true);
  });
});
