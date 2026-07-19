import { describe, it, expect, beforeEach } from "vitest";
import { UpdateLiveClass } from "../UpdateLiveClass";
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
    title: "Original Title",
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

describe("UpdateLiveClass", () => {
  let repo: InMemoryLiveClassRepository;
  let recordAuditLog: RecordAuditLogType;
  let useCase: UpdateLiveClass;

  beforeEach(() => {
    repo = new InMemoryLiveClassRepository();
    recordAuditLog = new RecordAuditLog({ auditLog: new InMemoryAuditLog(), idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" }, clock: new FixedClock(new Date()) });
    useCase = new UpdateLiveClass({ liveClassRepo: repo, recordAuditLog });
  });

  async function seed() {
    const lc = makeLiveClass({ id: "lc_1" });
    repo.seed(lc);
    return lc;
  }

  it("updates title and returns the live class id", async () => {
    await seed();
    const r = await useCase.execute({
      id: "lc_1",
      patch: { title: "New Title" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.liveClassId).toBe("lc_1");
  });

  it("persists the updated title in the repository", async () => {
    await seed();
    await useCase.execute({ id: "lc_1", patch: { title: "Updated Title" }, actorId: "admin_1" });
    const found = await repo.findById("lc_1");
    expect(found.ok && found.value?.title).toBe("Updated Title");
  });

  it("returns not_found when the live class does not exist", async () => {
    const r = await useCase.execute({
      id: "nonexistent",
      patch: { title: "New Title" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("fails validation when updated title is empty", async () => {
    await seed();
    const r = await useCase.execute({
      id: "lc_1",
      patch: { title: "  " },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_title");
  });

  it("records audit log on success", async () => {
    await seed();
    await useCase.execute({ id: "lc_1", patch: { title: "New Title" }, actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "live_class.updated")).toBe(true);
  });
});
