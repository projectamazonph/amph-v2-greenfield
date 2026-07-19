import { describe, it, expect, beforeEach } from "vitest";
import { DeleteLiveClass } from "../DeleteLiveClass";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { RecordAuditLog as RecordAuditLogType } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createLiveClass } from "@/domain/entities/LiveClass";

const futureDate = new Date("2026-09-01T10:00:00Z");

function makeLiveClass(overrides: Partial<Parameters<typeof createLiveClass>[0]> = {}) {
  const r = createLiveClass({
    id: "lc_1",
    courseId: "course_1",
    title: "Live Class 1",
    scheduledAt: futureDate,
    durationMinutes: 60,
    instructorId: "instructor_1",
    meetingUrl: "https://zoom.us/j/111",
    status: "scheduled" as const,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("DeleteLiveClass", () => {
  let repo: InMemoryLiveClassRepository;
  let recordAuditLog: RecordAuditLogType;
  let useCase: DeleteLiveClass;

  beforeEach(() => {
    repo = new InMemoryLiveClassRepository();
    recordAuditLog = new RecordAuditLog({ auditLog: new InMemoryAuditLog(), idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" }, clock: new FixedClock(new Date()) });
    useCase = new DeleteLiveClass({ liveClassRepo: repo, recordAuditLog });
  });

  it("deletes an existing live class (soft-delete)", async () => {
    repo.seed(makeLiveClass({ id: "lc_1" }));
    const r = await useCase.execute({ id: "lc_1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.liveClassId).toBe("lc_1");
  });

  it("is idempotent on non-existent live class", async () => {
    const r = await useCase.execute({ id: "nonexistent", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.liveClassId).toBe("nonexistent");
  });

  it("records audit log on deletion", async () => {
    repo.seed(makeLiveClass({ id: "lc_1" }));
    await useCase.execute({ id: "lc_1", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "live_class.deleted")).toBe(true);
  });
});
