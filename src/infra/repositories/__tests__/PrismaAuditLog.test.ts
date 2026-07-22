/**
 * PrismaAuditLog adapter test — P0-2 follow-up.
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays
 * fast and DB-free, following the pattern established by
 * `PrismaPasswordResetRepository.test.ts` / `PrismaOrderRepository.test.ts`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaAuditLog } from "@/infra/repositories/PrismaAuditLog";
import { createAuditLogEntry, type AuditLogEntry } from "@/domain/entities/AuditLogEntry";

interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  payload: unknown;
  createdAt: Date;
}

class FakePrismaClient {
  rows: AuditLogRow[] = [];
  failNextCreate = false;

  auditLog = {
    create: async (args: { data: AuditLogRow }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (this.rows.some((r) => r.id === args.data.id)) {
        throw new Error("unique constraint violation on id");
      }
      this.rows.push(args.data);
      return args.data;
    },
  };
}

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  const r = createAuditLogEntry({
    id: overrides.id ?? "ale_1",
    actorId: overrides.actorId ?? "admin_1",
    action: overrides.action ?? "course.created",
    targetType: overrides.targetType ?? "course",
    targetId: overrides.targetId ?? "course_1",
    metadata: overrides.metadata ?? { title: "New Course" },
    occurredAt: overrides.occurredAt ?? new Date("2026-07-22T00:00:00Z"),
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("PrismaAuditLog", () => {
  let db: FakePrismaClient;
  let repo: PrismaAuditLog;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaAuditLog(db as never);
  });

  it("persists an entry with every field mapped to the audit_logs table shape", async () => {
    const entry = makeEntry();
    const result = await repo.record(entry);
    expect(result.ok).toBe(true);

    expect(db.rows).toHaveLength(1);
    const row = db.rows[0];
    if (!row) throw new Error("row not created");
    expect(row.id).toBe("ale_1");
    expect(row.userId).toBe("admin_1");
    expect(row.action).toBe("course.created");
    expect(row.resource).toBe("course");
    expect(row.resourceId).toBe("course_1");
    expect(row.payload).toEqual({ title: "New Course" });
    expect(row.createdAt).toEqual(new Date("2026-07-22T00:00:00Z"));
  });

  it("persists an entry with empty metadata as an empty object", async () => {
    const entry = makeEntry({ id: "ale_2", metadata: {} });
    await repo.record(entry);
    const row = db.rows[0];
    if (!row) throw new Error("row not created");
    expect(row.payload).toEqual({});
  });

  it("persists multiple entries independently", async () => {
    await repo.record(makeEntry({ id: "ale_1", action: "course.created" }));
    await repo.record(makeEntry({ id: "ale_2", action: "course.updated" }));
    await repo.record(makeEntry({ id: "ale_3", action: "course.archived" }));

    expect(db.rows.map((r) => r.id)).toEqual(["ale_1", "ale_2", "ale_3"]);
    expect(db.rows.map((r) => r.action)).toEqual([
      "course.created",
      "course.updated",
      "course.archived",
    ]);
  });

  it("returns db_error when Prisma throws (never throws across the port boundary)", async () => {
    db.failNextCreate = true;
    const result = await repo.record(makeEntry());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});
