import { describe, it, expect, beforeEach } from "vitest";
import { CreateLiveClass } from "../CreateLiveClass";
import type { CreateLiveClassInput_ } from "../CreateLiveClass";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { RecordAuditLog as RecordAuditLogType } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";

const futureDate = new Date("2026-09-01T10:00:00Z");

interface MakeInput {
  id: string;
  courseId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  instructorId: string;
  meetingUrl: string;
  actorId: string;
}
function makeInput(overrides: Partial<MakeInput> = {}): MakeInput {
  return {
    id: "lc_1",
    courseId: "course_1",
    title: "Live Class 1",
    scheduledAt: futureDate,
    durationMinutes: 60,
    instructorId: "instructor_1",
    meetingUrl: "https://zoom.us/j/111",
    actorId: "admin_1",
    ...overrides,
  };
}

describe("CreateLiveClass", () => {
  let repo: InMemoryLiveClassRepository;
  let recordAuditLog: RecordAuditLogType;
  let useCase: CreateLiveClass;

  beforeEach(() => {
    repo = new InMemoryLiveClassRepository();
    recordAuditLog = new RecordAuditLog({ auditLog: new InMemoryAuditLog(), idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" }, clock: new FixedClock(new Date()) });
    useCase = new CreateLiveClass({
      liveClassRepo: repo,
      recordAuditLog,
    });
  });

  it("creates a live class and returns its id", async () => {
    
    const r = await useCase.execute(makeInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.liveClassId).toBe("lc_1");
  });

  it("persists the live class in the repository", async () => {
    await useCase.execute(makeInput({ id: "lc_new" }));
    const found = await repo.findById("lc_new");
    expect(found.ok && found.value?.title).toBe("Live Class 1");
  });

  it("fails validation when title is empty", async () => {
    const r = await useCase.execute(makeInput({ title: "   " }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_title");
  });

  it("fails validation when scheduledAt is in the past", async () => {
    const pastDate = new Date("2020-01-01T10:00:00Z");
    const r = await useCase.execute(makeInput({ id: "lc_past", scheduledAt: pastDate }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_scheduled_at");
  });

  it("fails when repository returns db_error (id conflict)", async () => {
    // Pre-seed the repo with lc_dup
    const { createLiveClass: clc } = await import("@/domain/entities/LiveClass");
    const dup = clc({
      id: "lc_dup",
      courseId: "c1",
      title: "Dup",
      scheduledAt: futureDate,
      durationMinutes: 30,
      instructorId: "i1",
      meetingUrl: "https://zoom.us/j/999",
      status: "scheduled",
    });
    if (!dup.ok) throw new Error("seed failed");
    repo.seed(dup.value);
    // The in-memory repo returns db_error on duplicate id
    const r = await useCase.execute(makeInput({ id: "lc_dup" }));
    expect(r.ok).toBe(false);
  });

  it("records an audit log entry on success", async () => {
    await useCase.execute(makeInput());
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "live_class.created")).toBe(true);
  });
});
