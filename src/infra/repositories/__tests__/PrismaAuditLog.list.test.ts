/**
 * PrismaAuditLog.list.test.ts — STORY-061 TDD.
 *
 * Red phase: these tests define the contract for the list() method
 * on PrismaAuditLog before the implementation exists.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaAuditLog } from "@/infra/repositories/PrismaAuditLog";
import type { AuditLogPage } from "@/ports/repositories/IAuditLog";

function makeMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    ...overrides,
  } as unknown as {
    auditLog: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };
}

function getOk(r: { ok: true; value: AuditLogPage } | { ok: false; error: unknown }): AuditLogPage {
  if (!r.ok) throw new Error("Unexpected error: " + String(r.error));
  return r.value;
}

describe("PrismaAuditLog.list", () => {
  it("returns empty page when no rows match", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    const r = await repo.list({});

    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries).toHaveLength(0);
    expect(page.total).toBe(0);
    expect(page.nextCursor).toBeNull();
  });

  it("maps Prisma rows to AuditLogEntry and sorts by createdAt desc", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([
      {
        id: "ale_b",
        userId: "admin_1",
        action: "course.updated",
        resource: "course",
        resourceId: "c1",
        payload: { title: "Intro" },
        createdAt: new Date("2026-07-02T10:00:00Z"),
      },
      {
        id: "ale_a",
        userId: "admin_1",
        action: "course.created",
        resource: "course",
        resourceId: "c1",
        payload: {},
        createdAt: new Date("2026-07-01T10:00:00Z"),
      },
    ]);
    mockDb.auditLog.count.mockResolvedValue(2);

    const repo = new PrismaAuditLog(mockDb as never);
    const r = await repo.list({});

    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries).toHaveLength(2);
    expect(page.entries[0]).toMatchObject({
      id: "ale_b",
      actorId: "admin_1",
      action: "course.updated",
      targetType: "course",
      targetId: "c1",
    });
    expect(page.entries[1]?.id).toBe("ale_a");
    expect(page.total).toBe(2);
  });

  it("passes actorId filter as userId where clause", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    await repo.list({ actorId: "admin_5" });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "admin_5" }),
      }),
    );
    expect(mockDb.auditLog.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: "admin_5" }),
    });
  });

  it("passes action filter", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    await repo.list({ action: "course.created" });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: "course.created" }),
      }),
    );
  });

  it("passes targetType filter as resource filter", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    await repo.list({ targetType: "module" });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resource: "module" }),
      }),
    );
  });

  it("passes targetId filter as resourceId filter", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    await repo.list({ targetId: "course_abc" });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resourceId: "course_abc" }),
      }),
    );
  });

  it("passes from/to date filters as createdAt gte/lte", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    const from = new Date("2026-07-01T00:00:00Z");
    const to = new Date("2026-07-31T23:59:59Z");
    await repo.list({ from, to });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: from,
            lte: to,
          },
        }),
      }),
    );
  });

  it("caps limit at 100", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    await repo.list({ limit: 500 });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it("uses default limit of 50 when not specified", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    await repo.list({});

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
  });

  it("applies cursor as where-clause keyset filter (compound OR)", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    const cursor = "2026-07-05T10:00:00.000Z::ale_xyz";
    const cursorTs = new Date("2026-07-05T10:00:00.000Z");
    await repo.list({ limit: 50, cursor });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: expect.objectContaining({
          OR: [
            { createdAt: { lt: cursorTs } },
            { AND: [{ createdAt: cursorTs }, { id: { lt: "ale_xyz" } }] },
          ],
        }),
      }),
    );
  });

  it("sorts by createdAt desc, id desc as tiebreaker", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockResolvedValue([]);
    mockDb.auditLog.count.mockResolvedValue(0);

    const repo = new PrismaAuditLog(mockDb as never);
    await repo.list({});

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("returns db_error when Prisma throws", async () => {
    const mockDb = makeMockPrisma();
    mockDb.auditLog.findMany.mockRejectedValue(new Error("connection refused"));

    const repo = new PrismaAuditLog(mockDb as never);
    const r = await repo.list({});

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("db_error");
      expect(r.error.message).toContain("connection refused");
    }
  });
});
