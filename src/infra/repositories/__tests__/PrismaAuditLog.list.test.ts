/**
 * PrismaAuditLog.list() tests — STORY-061.
 *
 * Uses the hand-rolled in-memory PrismaClient fake following the
 * established pattern from PrismaAuditLog.test.ts.
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
  failNextFindMany = false;
  failNextCount = false;

  auditLog = {
    create: async (args: { data: AuditLogRow }) => {
      this.rows.push(args.data);
      return args.data;
    },

    findMany: async (args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>[];
      take?: number;
      skip?: number;
      cursor?: { id_createdAt: { id: string; createdAt: Date } };
    }) => {
      if (this.failNextFindMany) {
        this.failNextFindMany = false;
        throw new Error("forced findMany error");
      }

      let results = [...this.rows];

      // Apply filters
      if (args.where) {
        const w = args.where as Record<string, unknown>;
        if (w.userId !== undefined) results = results.filter((r) => r.userId === w.userId);
        if (w.action !== undefined) results = results.filter((r) => r.action === w.action);
        if (w.resource !== undefined) results = results.filter((r) => r.resource === w.resource);
        if (w.resourceId !== undefined)
          results = results.filter((r) => r.resourceId === w.resourceId);
        if (w.createdAt?.gte !== undefined) {
          results = results.filter((r) => r.createdAt >= (w.createdAt.gte as Date));
        }
        if (w.createdAt?.lte !== undefined) {
          results = results.filter((r) => r.createdAt <= (w.createdAt.lte as Date));
        }
      }

      // Sort descending by createdAt, then id
      results.sort((a, b) => {
        const t = b.createdAt.getTime() - a.createdAt.getTime();
        if (t !== 0) return t;
        return b.id.localeCompare(a.id);
      });

      // Cursor-based skip
      if (args.cursor) {
        const cursorTs = args.cursor.id_createdAt.createdAt.getTime();
        const cursorId = args.cursor.id_createdAt.id;
        results = results.filter(
          (r) =>
            r.createdAt.getTime() < cursorTs ||
            (r.createdAt.getTime() === cursorTs && r.id < cursorId),
        );
      }

      // Skip (for after cursor)
      if (args.skip !== undefined) {
        results = results.slice(args.skip);
      }

      // Take (limit)
      if (args.take !== undefined) {
        results = results.slice(0, args.take);
      }

      return results;
    },

    count: async (args: { where?: Record<string, unknown> }) => {
      if (this.failNextCount) {
        this.failNextCount = false;
        throw new Error("forced count error");
      }

      let results = [...this.rows];

      if (args.where) {
        const w = args.where as Record<string, unknown>;
        if (w.userId !== undefined) results = results.filter((r) => r.userId === w.userId);
        if (w.action !== undefined) results = results.filter((r) => r.action === w.action);
        if (w.resource !== undefined) results = results.filter((r) => r.resource === w.resource);
        if (w.resourceId !== undefined)
          results = results.filter((r) => r.resourceId === w.resourceId);
        if (w.createdAt?.gte !== undefined) {
          results = results.filter((r) => r.createdAt >= (w.createdAt.gte as Date));
        }
        if (w.createdAt?.lte !== undefined) {
          results = results.filter((r) => r.createdAt <= (w.createdAt.lte as Date));
        }
      }

      return results.length;
    },
  };
}

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  const r = createAuditLogEntry({
    id: `ale_${Math.random().toString(36).slice(2, 8)}`,
    actorId: "admin_1",
    action: "course.created",
    targetType: "course",
    targetId: "course_1",
    metadata: {},
    occurredAt: new Date("2026-07-22T10:00:00Z"),
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("PrismaAuditLog.list", () => {
  let db: FakePrismaClient;
  let repo: PrismaAuditLog;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaAuditLog(db as never);
  });

  async function seedRows(count: number, baseDate: Date = new Date("2026-07-22T10:00:00Z")) {
    const rows: AuditLogRow[] = [];
    for (let i = 0; i < count; i++) {
      const entry = makeEntry({
        id: `ale_${String(i).padStart(3, "0")}`,
        occurredAt: new Date(baseDate.getTime() - i * 60_000),
      });
      rows.push({
        id: entry.id,
        userId: entry.actorId,
        action: entry.action,
        resource: entry.targetType,
        resourceId: entry.targetId,
        payload: entry.metadata,
        createdAt: entry.occurredAt,
      });
    }
    db.rows.push(...rows);
  }

  it("returns empty page with total 0 when table is empty", async () => {
    const result = await repo.list({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toEqual([]);
    expect(result.value.nextCursor).toBeNull();
    expect(result.value.total).toBe(0);
  });

  it("returns all entries sorted by occurredAt descending", async () => {
    await seedRows(3);
    const result = await repo.list({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(3);
    expect(result.value.total).toBe(3);
    // IDs are sorted descending by timestamp: ale_002, ale_001, ale_000
    expect(result.value.entries[0].id).toBe("ale_002");
    expect(result.value.entries[2].id).toBe("ale_000");
  });

  it("maps actorId filter to userId column", async () => {
    db.rows.push(
      {
        id: "e1",
        userId: "admin_1",
        action: "a",
        resource: "r",
        resourceId: "r1",
        payload: {},
        createdAt: new Date(),
      },
      {
        id: "e2",
        userId: "admin_2",
        action: "a",
        resource: "r",
        resourceId: "r1",
        payload: {},
        createdAt: new Date(),
      },
    );

    const result = await repo.list({ actorId: "admin_1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(1);
    expect(result.value.entries[0].actorId).toBe("admin_1");
    expect(result.value.total).toBe(1);
  });

  it("maps targetType filter to resource column", async () => {
    db.rows.push(
      {
        id: "e1",
        userId: "u1",
        action: "a",
        resource: "course",
        resourceId: "r1",
        payload: {},
        createdAt: new Date(),
      },
      {
        id: "e2",
        userId: "u1",
        action: "a",
        resource: "badge",
        resourceId: "r1",
        payload: {},
        createdAt: new Date(),
      },
    );

    const result = await repo.list({ targetType: "badge" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(1);
    expect(result.value.entries[0].targetType).toBe("badge");
    expect(result.value.total).toBe(1);
  });

  it("maps targetId filter to resourceId column", async () => {
    db.rows.push(
      {
        id: "e1",
        userId: "u1",
        action: "a",
        resource: "c",
        resourceId: "c1",
        payload: {},
        createdAt: new Date(),
      },
      {
        id: "e2",
        userId: "u1",
        action: "a",
        resource: "c",
        resourceId: "c2",
        payload: {},
        createdAt: new Date(),
      },
    );

    const result = await repo.list({ targetId: "c1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(1);
    expect(result.value.entries[0].targetId).toBe("c1");
    expect(result.value.total).toBe(1);
  });

  it("maps from/to to createdAt range", async () => {
    db.rows.push(
      {
        id: "e1",
        userId: "u1",
        action: "a",
        resource: "r",
        resourceId: "r1",
        payload: {},
        createdAt: new Date("2026-07-01T00:00:00Z"),
      },
      {
        id: "e2",
        userId: "u1",
        action: "a",
        resource: "r",
        resourceId: "r1",
        payload: {},
        createdAt: new Date("2026-07-15T00:00:00Z"),
      },
      {
        id: "e3",
        userId: "u1",
        action: "a",
        resource: "r",
        resourceId: "r1",
        payload: {},
        createdAt: new Date("2026-07-20T00:00:00Z"),
      },
    );

    const result = await repo.list({
      from: new Date("2026-07-10T00:00:00Z"),
      to: new Date("2026-07-21T00:00:00Z"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(2);
    expect(result.value.total).toBe(2);
  });

  it("respects limit (default 50, max 100)", async () => {
    await seedRows(120);

    const defaultLimit = await repo.list({});
    expect(defaultLimit.ok).toBe(true);
    if (!defaultLimit.ok) return;
    expect(defaultLimit.value.entries).toHaveLength(50);
    expect(defaultLimit.value.total).toBe(120);

    const customLimit = await repo.list({ limit: 10 });
    expect(customLimit.ok).toBe(true);
    if (!customLimit.ok) return;
    expect(customLimit.value.entries).toHaveLength(10);

    const overMax = await repo.list({ limit: 200 });
    expect(overMax.ok).toBe(true);
    if (!overMax.ok) return;
    expect(overMax.value.entries).toHaveLength(100);
  });

  it("returns nextCursor when more rows exist", async () => {
    await seedRows(5);

    const result = await repo.list({ limit: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(2);
    expect(result.value.nextCursor).not.toBeNull();
    expect(result.value.total).toBe(5);
  });

  it("returns null nextCursor when on last page", async () => {
    await seedRows(3);

    const result = await repo.list({ limit: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextCursor).toBeNull();
  });

  it("uses cursor to skip already-seen rows", async () => {
    await seedRows(5);

    const page1 = await repo.list({ limit: 2 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    const cursor = page1.value.nextCursor;
    expect(cursor).not.toBeNull();

    const page2 = await repo.list({ limit: 2, cursor: cursor! });
    expect(page2.ok).toBe(true);
    if (!page2.ok) return;
    // No overlap with page 1
    const page1Ids = page1.value.entries.map((e) => e.id);
    const page2Ids = page2.value.entries.map((e) => e.id);
    expect(page2Ids.some((id) => page1Ids.includes(id))).toBe(false);
  });

  it("reconstructs AuditLogEntry from DB row correctly", async () => {
    const entry = makeEntry({
      id: "ale_test",
      actorId: "admin_test",
      action: "badge.created",
      targetType: "badge",
      targetId: "badge_1",
      metadata: { name: "Quick Starter" },
      occurredAt: new Date("2026-07-22T12:00:00Z"),
    });
    db.rows.push({
      id: entry.id,
      userId: entry.actorId,
      action: entry.action,
      resource: entry.targetType,
      resourceId: entry.targetId,
      payload: entry.metadata,
      createdAt: entry.occurredAt,
    });

    const result = await repo.list({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(1);
    const returned = result.value.entries[0];
    expect(returned.id).toBe("ale_test");
    expect(returned.actorId).toBe("admin_test");
    expect(returned.action).toBe("badge.created");
    expect(returned.targetType).toBe("badge");
    expect(returned.targetId).toBe("badge_1");
    expect(returned.metadata).toEqual({ name: "Quick Starter" });
  });

  it("returns db_error when findMany throws", async () => {
    await seedRows(1);
    db.failNextFindMany = true;

    const result = await repo.list({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("returns db_error when count throws", async () => {
    await seedRows(1);
    db.failNextCount = true;

    const result = await repo.list({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});
