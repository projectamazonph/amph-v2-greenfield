/**
 * InMemoryAuditLog.test.ts — STORY-050a.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { createAuditLogEntry, type AuditLogEntry } from "@/domain/entities/AuditLogEntry";

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  const r = createAuditLogEntry({
    id: `ale_${Math.random().toString(36).slice(2, 8)}`,
    actorId: "u1",
    action: "course.created",
    targetType: "course",
    targetId: "c1",
    occurredAt: new Date(),
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("InMemoryAuditLog", () => {
  let repo: InMemoryAuditLog;

  beforeEach(() => {
    repo = new InMemoryAuditLog();
  });

  it("records an entry on the happy path", async () => {
    const entry = makeEntry();
    const r = await repo.record(entry);
    expect(r.ok).toBe(true);
    expect(repo.getAll()).toHaveLength(1);
  });

  it("records multiple entries in order", async () => {
    await repo.record(makeEntry({ id: "ale_1" }));
    await repo.record(makeEntry({ id: "ale_2" }));
    await repo.record(makeEntry({ id: "ale_3" }));

    const all = repo.getAll();
    expect(all.map((e) => e.id)).toEqual(["ale_1", "ale_2", "ale_3"]);
  });

  it("clear() empties the store", async () => {
    await repo.record(makeEntry());
    repo.clear();
    expect(repo.getAll()).toEqual([]);
  });
});
