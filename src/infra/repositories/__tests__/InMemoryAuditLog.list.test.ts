/**
 * InMemoryAuditLog.list() tests — STORY-061.
 *
 * Tests the InMemory adapter's list() implementation:
 * happy path, all filter combinations, pagination, ordering.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { createAuditLogEntry, type AuditLogEntry } from "@/domain/entities/AuditLogEntry";

function makeEntry(
  overrides: Partial<Parameters<typeof createAuditLogEntry>[0]> = {},
): AuditLogEntry {
  const r = createAuditLogEntry({
    id: `ale_${Math.random().toString(36).slice(2, 8)}`,
    actorId: "u1",
    action: "course.created",
    targetType: "course",
    targetId: "c1",
    occurredAt: new Date("2026-07-22T10:00:00Z"),
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("InMemoryAuditLog.list", () => {
  let repo: InMemoryAuditLog;

  beforeEach(() => {
    repo = new InMemoryAuditLog();
  });

  it("returns empty page with zero total when store is empty", async () => {
    const result = await repo.list({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toEqual([]);
    expect(result.value.nextCursor).toBeNull();
    expect(result.value.total).toBe(0);
  });

  it("returns all entries sorted by occurredAt descending", async () => {
    await repo.record(makeEntry({ id: "oldest", occurredAt: new Date("2026-07-01T00:00:00Z") }));
    await repo.record(makeEntry({ id: "middle", occurredAt: new Date("2026-07-15T00:00:00Z") }));
    await repo.record(makeEntry({ id: "newest", occurredAt: new Date("2026-07-22T00:00:00Z") }));

    const result = await repo.list({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries.map((e) => e.id)).toEqual(["newest", "middle", "oldest"]);
    expect(result.value.total).toBe(3);
  });

  it("filters by actorId", async () => {
    await repo.record(makeEntry({ id: "e1", actorId: "admin_1" }));
    await repo.record(makeEntry({ id: "e2", actorId: "admin_2" }));
    await repo.record(makeEntry({ id: "e3", actorId: "admin_1" }));

    const result = await repo.list({ actorId: "admin_1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries.map((e) => e.id)).toEqual(["e3", "e1"]);
    expect(result.value.total).toBe(2);
  });

  it("filters by action", async () => {
    await repo.record(makeEntry({ id: "e1", action: "course.created" }));
    await repo.record(makeEntry({ id: "e2", action: "course.updated" }));
    await repo.record(makeEntry({ id: "e3", action: "course.archived" }));

    const result = await repo.list({ action: "course.updated" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries.map((e) => e.id)).toEqual(["e2"]);
    expect(result.value.total).toBe(1);
  });

  it("filters by targetType", async () => {
    await repo.record(makeEntry({ id: "e1", targetType: "course" }));
    await repo.record(makeEntry({ id: "e2", targetType: "module" }));
    await repo.record(makeEntry({ id: "e3", targetType: "course" }));

    const result = await repo.list({ targetType: "module" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries.map((e) => e.id)).toEqual(["e2"]);
    expect(result.value.total).toBe(1);
  });

  it("filters by targetId", async () => {
    await repo.record(makeEntry({ id: "e1", targetId: "c1" }));
    await repo.record(makeEntry({ id: "e2", targetId: "c2" }));
    await repo.record(makeEntry({ id: "e3", targetId: "c1" }));

    const result = await repo.list({ targetId: "c1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries.map((e) => e.id)).toEqual(["e3", "e1"]);
    expect(result.value.total).toBe(2);
  });

  it("filters by date range from/to", async () => {
    await repo.record(makeEntry({ id: "e1", occurredAt: new Date("2026-07-01T00:00:00Z") }));
    await repo.record(makeEntry({ id: "e2", occurredAt: new Date("2026-07-15T00:00:00Z") }));
    await repo.record(makeEntry({ id: "e3", occurredAt: new Date("2026-07-20T00:00:00Z") }));

    const result = await repo.list({
      from: new Date("2026-07-10T00:00:00Z"),
      to: new Date("2026-07-21T00:00:00Z"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries.map((e) => e.id)).toEqual(["e3", "e2"]);
    expect(result.value.total).toBe(2);
  });

  it("enforces limit (default 50, max 100)", async () => {
    for (let i = 0; i < 120; i++) {
      await repo.record(makeEntry({ id: `e${i}` }));
    }

    const noLimit = await repo.list({});
    expect(noLimit.ok).toBe(true);
    if (!noLimit.ok) return;
    expect(noLimit.value.entries).toHaveLength(50); // default limit
    expect(noLimit.value.total).toBe(120);

    const withLimit = await repo.list({ limit: 10 });
    expect(withLimit.ok).toBe(true);
    if (!withLimit.ok) return;
    expect(withLimit.value.entries).toHaveLength(10);

    const overMax = await repo.list({ limit: 200 });
    expect(overMax.ok).toBe(true);
    if (!overMax.ok) return;
    expect(overMax.value.entries).toHaveLength(100); // capped at 100
  });

  it("returns nextCursor when more rows exist", async () => {
    for (let i = 0; i < 5; i++) {
      await repo.record(makeEntry({ id: `e${i}` }));
    }

    const result = await repo.list({ limit: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(2);
    expect(result.value.nextCursor).not.toBeNull();
    expect(result.value.total).toBe(5);
  });

  it("returns null nextCursor when no more rows", async () => {
    await repo.record(makeEntry({ id: "e1" }));
    await repo.record(makeEntry({ id: "e2" }));

    const result = await repo.list({ limit: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextCursor).toBeNull();
  });

  it("combines multiple filters", async () => {
    await repo.record(
      makeEntry({ id: "e1", actorId: "a1", action: "course.created", targetType: "course" }),
    );
    await repo.record(
      makeEntry({ id: "e2", actorId: "a1", action: "course.updated", targetType: "course" }),
    );
    await repo.record(
      makeEntry({ id: "e3", actorId: "a2", action: "course.created", targetType: "course" }),
    );
    await repo.record(
      makeEntry({ id: "e4", actorId: "a1", action: "course.created", targetType: "badge" }),
    );

    const result = await repo.list({ actorId: "a1", action: "course.created" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries.map((e) => e.id)).toEqual(["e1"]);
    expect(result.value.total).toBe(1);
  });
});
