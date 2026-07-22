/**
 * PrismaLiveClassRepository adapter test, P0-2 follow-up (STORY-050c).
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays fast
 * and DB-free, following the pattern established by
 * PrismaPasswordResetRepository.test.ts / PrismaOrderRepository.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaLiveClassRepository } from "@/infra/live-class/PrismaLiveClassRepository";
import type { LiveClass } from "@/domain/entities/LiveClass";

interface LiveClassRow {
  id: string;
  courseId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  instructorId: string;
  meetingUrl: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrismaClient {
  rows: LiveClassRow[] = [];
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;

  liveClass = {
    create: async (args: { data: Omit<LiveClassRow, "createdAt" | "updatedAt"> }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (this.rows.some((r) => r.id === args.data.id)) {
        const err = new Error("unique constraint violation") as Error & { code: string };
        err.code = "P2002";
        throw err;
      }
      const row: LiveClassRow = { ...args.data, createdAt: new Date(), updatedAt: new Date() };
      this.rows.push(row);
      return row;
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      return this.rows.find((r) => r.id === args.where.id) ?? null;
    },
    findMany: async (args: {
      where?: { status?: { not: string }; courseId?: string };
      orderBy?: { scheduledAt: "asc" | "desc" };
    }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      let rows = [...this.rows];
      if (args.where?.status?.not !== undefined) {
        rows = rows.filter((r) => r.status !== args.where!.status!.not);
      }
      if (args.where?.courseId !== undefined) {
        rows = rows.filter((r) => r.courseId === args.where!.courseId);
      }
      if (args.orderBy?.scheduledAt === "asc") {
        rows.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
      }
      return rows;
    },
    update: async (args: { where: { id: string }; data: Partial<LiveClassRow> }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) {
        const err = new Error("Record not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
  };
}

function makeLiveClass(overrides: Partial<LiveClass> = {}): LiveClass {
  return {
    id: overrides.id ?? "lc_1",
    courseId: overrides.courseId ?? "course_1",
    title: overrides.title ?? "Bid Optimization Deep Dive",
    scheduledAt: overrides.scheduledAt ?? new Date("2026-08-01T10:00:00Z"),
    durationMinutes: overrides.durationMinutes ?? 60,
    instructorId: overrides.instructorId ?? "instructor_1",
    meetingUrl: overrides.meetingUrl ?? "https://meet.example.com/abc",
    status: overrides.status ?? "scheduled",
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

describe("PrismaLiveClassRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaLiveClassRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaLiveClassRepository(db as never);
  });

  // ── create + findById ──────────────────────────────────────

  it("create + findById round-trips a live class", async () => {
    const createResult = await repo.create(makeLiveClass());
    expect(createResult.ok).toBe(true);

    const found = await repo.findById("lc_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.title).toBe("Bid Optimization Deep Dive");
    expect(found.value?.status).toBe("scheduled");
  });

  it("findById returns null for an unknown id (not an error)", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── listAll ────────────────────────────────────────────────

  it("listAll excludes cancelled classes and sorts by scheduledAt ascending", async () => {
    await repo.create(
      makeLiveClass({ id: "lc_late", scheduledAt: new Date("2026-08-02T00:00:00Z") }),
    );
    await repo.create(
      makeLiveClass({ id: "lc_early", scheduledAt: new Date("2026-08-01T00:00:00Z") }),
    );
    await repo.create(
      makeLiveClass({
        id: "lc_cancelled",
        status: "cancelled",
        scheduledAt: new Date("2026-08-01T12:00:00Z"),
      }),
    );

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((c) => c.id)).toEqual(["lc_early", "lc_late"]);
  });

  it("listAll filters by courseId", async () => {
    await repo.create(makeLiveClass({ id: "lc_1", courseId: "course_a" }));
    await repo.create(makeLiveClass({ id: "lc_2", courseId: "course_b" }));

    const result = await repo.listAll({ courseId: "course_a" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((c) => c.id)).toEqual(["lc_1"]);
  });

  // ── update ─────────────────────────────────────────────────

  it("update persists changed fields", async () => {
    await repo.create(makeLiveClass({ id: "lc_1", title: "Old Title" }));
    const result = await repo.update(makeLiveClass({ id: "lc_1", title: "New Title" }));
    expect(result.ok).toBe(true);

    const found = await repo.findById("lc_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.title).toBe("New Title");
  });

  it("update returns not_found when the live class does not exist", async () => {
    const result = await repo.update(makeLiveClass({ id: "never-created" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── delete (soft: sets status to cancelled) ──────────────────

  it("delete sets status to cancelled instead of removing the row", async () => {
    await repo.create(makeLiveClass({ id: "lc_1" }));
    const deleteResult = await repo.delete("lc_1");
    expect(deleteResult.ok).toBe(true);

    const found = await repo.findById("lc_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.status).toBe("cancelled");
  });

  it("delete removes the class from listAll (cancelled is hidden)", async () => {
    await repo.create(makeLiveClass({ id: "lc_1" }));
    await repo.delete("lc_1");

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it("delete returns not_found when the live class does not exist", async () => {
    const result = await repo.delete("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── error mapping ──────────────────────────────────────────

  it("create returns db_error when Prisma throws", async () => {
    db.failNextCreate = true;
    const result = await repo.create(makeLiveClass());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findById returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.findById("any");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("listAll returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.listAll();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("update returns db_error when Prisma throws a non-P2025 error", async () => {
    await repo.create(makeLiveClass({ id: "lc_1" }));
    db.failNextUpdate = true;
    const result = await repo.update(makeLiveClass({ id: "lc_1" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("delete returns db_error when Prisma throws a non-P2025 error", async () => {
    await repo.create(makeLiveClass({ id: "lc_1" }));
    db.failNextUpdate = true;
    const result = await repo.delete("lc_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});
