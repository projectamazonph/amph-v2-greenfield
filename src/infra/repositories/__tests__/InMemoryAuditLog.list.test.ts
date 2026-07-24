/**
 * InMemoryAuditLog.list.test.ts — STORY-061 TDD.
 *
 * Red phase: these tests define the contract for the list() method
 * on InMemoryAuditLog before the implementation exists.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { createAuditLogEntry, type AuditLogEntry } from "@/domain/entities/AuditLogEntry";
import type { AuditLogPage } from "@/ports/repositories/IAuditLog";

function makeEntry(
  overrides: Partial<Parameters<typeof createAuditLogEntry>[0]> = {},
): AuditLogEntry {
  const r = createAuditLogEntry({
    id: `ale_${Math.random().toString(36).slice(2, 8)}`,
    actorId: "admin_1",
    action: "course.created",
    targetType: "course",
    targetId: "c1",
    occurredAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed: " + r.error.message);
  return r.value;
}

function getOk(r: { ok: true; value: AuditLogPage } | { ok: false; error: unknown }): AuditLogPage {
  if (!r.ok) throw new Error("Unexpected error: " + String(r.error));
  return r.value;
}

describe("InMemoryAuditLog.list", () => {
  let repo: InMemoryAuditLog;

  beforeEach(() => {
    repo = new InMemoryAuditLog();
  });

  it("returns empty page with total 0 when store is empty", async () => {
    const r = await repo.list({});
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries).toHaveLength(0);
    expect(page.total).toBe(0);
    expect(page.nextCursor).toBeNull();
  });

  it("returns all entries sorted by occurredAt desc", async () => {
    const t1 = new Date("2026-07-01T10:00:00Z");
    const t2 = new Date("2026-07-02T10:00:00Z");
    const t3 = new Date("2026-07-03T10:00:00Z");
    await repo.record(makeEntry({ id: "a", occurredAt: t1 }));
    await repo.record(makeEntry({ id: "b", occurredAt: t2 }));
    await repo.record(makeEntry({ id: "c", occurredAt: t3 }));

    const r = await repo.list({});
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries.map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(page.total).toBe(3);
  });

  it("filters by actorId", async () => {
    await repo.record(makeEntry({ id: "a", actorId: "admin_1" }));
    await repo.record(makeEntry({ id: "b", actorId: "admin_2" }));
    await repo.record(makeEntry({ id: "c", actorId: "admin_1" }));

    const r = await repo.list({ actorId: "admin_1" });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries.map((e) => e.id)).toEqual(["c", "a"]);
    expect(page.total).toBe(2);
  });

  it("filters by action", async () => {
    await repo.record(makeEntry({ id: "a", action: "course.created" }));
    await repo.record(makeEntry({ id: "b", action: "course.updated" }));
    await repo.record(makeEntry({ id: "c", action: "course.created" }));

    const r = await repo.list({ action: "course.created" });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries.map((e) => e.id)).toEqual(["c", "a"]);
    expect(page.total).toBe(2);
  });

  it("filters by targetType", async () => {
    await repo.record(makeEntry({ id: "a", targetType: "course" }));
    await repo.record(makeEntry({ id: "b", targetType: "module" }));
    await repo.record(makeEntry({ id: "c", targetType: "course" }));

    const r = await repo.list({ targetType: "module" });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries.map((e) => e.id)).toEqual(["b"]);
    expect(page.total).toBe(1);
  });

  it("filters by targetId", async () => {
    await repo.record(makeEntry({ id: "a", targetId: "c1" }));
    await repo.record(makeEntry({ id: "b", targetId: "c2" }));

    const r = await repo.list({ targetId: "c1" });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries.map((e) => e.id)).toEqual(["a"]);
    expect(page.total).toBe(1);
  });

  it("filters by from date (inclusive)", async () => {
    await repo.record(makeEntry({ id: "a", occurredAt: new Date("2026-07-01T00:00:00Z") }));
    await repo.record(makeEntry({ id: "b", occurredAt: new Date("2026-07-05T00:00:00Z") }));
    await repo.record(makeEntry({ id: "c", occurredAt: new Date("2026-07-10T00:00:00Z") }));

    const r = await repo.list({ from: new Date("2026-07-05T00:00:00Z") });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries.map((e) => e.id)).toEqual(["c", "b"]);
    expect(page.total).toBe(2);
  });

  it("filters by to date (inclusive)", async () => {
    await repo.record(makeEntry({ id: "a", occurredAt: new Date("2026-07-01T00:00:00Z") }));
    await repo.record(makeEntry({ id: "b", occurredAt: new Date("2026-07-05T00:00:00Z") }));
    await repo.record(makeEntry({ id: "c", occurredAt: new Date("2026-07-10T00:00:00Z") }));

    const r = await repo.list({ to: new Date("2026-07-05T00:00:00Z") });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries.map((e) => e.id)).toEqual(["b", "a"]);
    expect(page.total).toBe(2);
  });

  it("applies limit and returns nextCursor when more entries exist", async () => {
    const times = [
      new Date("2026-07-01T10:00:00Z"),
      new Date("2026-07-02T10:00:00Z"),
      new Date("2026-07-03T10:00:00Z"),
    ];
    await repo.record(makeEntry({ id: "a", occurredAt: times[0] }));
    await repo.record(makeEntry({ id: "b", occurredAt: times[1] }));
    await repo.record(makeEntry({ id: "c", occurredAt: times[2] }));

    const r = await repo.list({ limit: 2 });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries).toHaveLength(2);
    expect(page.entries[0].id).toBe("c");
    expect(page.entries[1].id).toBe("b");
    expect(page.total).toBe(3);
    expect(page.nextCursor).not.toBeNull();
    // Cursor encodes the last item's occurredAt and id
    expect(page.nextCursor).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z:b$/);
  });

  it("returns nextCursor null when limit >= total", async () => {
    await repo.record(makeEntry({ id: "a" }));
    await repo.record(makeEntry({ id: "b" }));

    const r = await repo.list({ limit: 10 });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("respects cursor for pagination — returns next page", async () => {
    const t1 = new Date("2026-07-01T10:00:00Z");
    const t2 = new Date("2026-07-02T10:00:00Z");
    const t3 = new Date("2026-07-03T10:00:00Z");
    await repo.record(makeEntry({ id: "a", occurredAt: t1 }));
    await repo.record(makeEntry({ id: "b", occurredAt: t2 }));
    await repo.record(makeEntry({ id: "c", occurredAt: t3 }));

    // First page
    const page1 = await repo.list({ limit: 2 });
    expect(page1.ok).toBe(true);
    const p1 = getOk(page1);
    expect(p1.entries.map((e) => e.id)).toEqual(["c", "b"]);
    expect(p1.nextCursor).not.toBeNull();

    // Second page using cursor
    const page2 = await repo.list({ limit: 2, cursor: p1.nextCursor! });
    expect(page2.ok).toBe(true);
    const p2 = getOk(page2);
    expect(p2.entries.map((e) => e.id)).toEqual(["a"]);
    expect(p2.nextCursor).toBeNull();
    expect(p2.total).toBe(3);
  });

  it("combines multiple filters (actorId + action)", async () => {
    await repo.record(makeEntry({ id: "a", actorId: "admin_1", action: "course.created" }));
    await repo.record(makeEntry({ id: "b", actorId: "admin_2", action: "course.created" }));
    await repo.record(makeEntry({ id: "c", actorId: "admin_1", action: "course.updated" }));

    const r = await repo.list({ actorId: "admin_1", action: "course.created" });
    expect(r.ok).toBe(true);
    const page = getOk(r);
    expect(page.entries.map((e) => e.id)).toEqual(["a"]);
    expect(page.total).toBe(1);
  });
});
