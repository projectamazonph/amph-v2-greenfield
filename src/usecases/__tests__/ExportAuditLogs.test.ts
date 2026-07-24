/**
 * ExportAuditLogs.test.ts — STORY-061 TDD.
 *
 * The use case loops pages of entries from the repo until nextCursor is null,
 * collecting all entries into a flat array for CSV export.
 */

import { describe, it, expect, vi } from "vitest";
import { ExportAuditLogs } from "@/usecases/ExportAuditLogs";
import type { IAuditLog, AuditLogPage, AuditLogError } from "@/ports/repositories/IAuditLog";
import { Result } from "@/domain/shared/Result";
import { createAuditLogEntry } from "@/domain/entities/AuditLogEntry";

function makeEntry(id: string, actorId = "admin_1", occurredAt = new Date("2026-07-01T10:00:00Z")) {
  const r = createAuditLogEntry({
    id,
    actorId,
    action: "course.created",
    targetType: "course",
    targetId: "c1",
    occurredAt,
    metadata: {},
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

type ListFn = IAuditLog["list"];

describe("ExportAuditLogs", () => {
  it("returns all entries collected from a single page", async () => {
    const mockPage: AuditLogPage = {
      entries: [makeEntry("ale_1"), makeEntry("ale_2")],
      nextCursor: null,
      total: 2,
    };
    const list = vi.fn(async (): ReturnType<ListFn> => Result.ok(mockPage));
    const repo = { list } as unknown as IAuditLog;
    const useCase = new ExportAuditLogs({ auditLog: repo });

    const r = await useCase.execute({ filters: {} });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entries).toHaveLength(2);
      expect(r.entries.map((e) => e.id)).toEqual(["ale_1", "ale_2"]);
    }
  });

  it("collects entries from multiple pages until nextCursor is null", async () => {
    // Build a full BATCH-size first page (100 entries) to force pagination
    const BATCH = 100;
    const fullPageEntries = Array.from({ length: BATCH }, (_, i) => makeEntry(`ale_full_${i}`));
    const page1: AuditLogPage = {
      entries: fullPageEntries,
      nextCursor: "2026-07-01T10:00:00.000Z::ale_remaining",
      total: BATCH + 2,
    };
    const page2: AuditLogPage = {
      entries: [makeEntry("ale_remaining_1"), makeEntry("ale_remaining_2")],
      nextCursor: null,
      total: BATCH + 2,
    };

    let callCount = 0;
    const list = vi.fn(async (): ReturnType<ListFn> => {
      callCount++;
      // Call 1: countResult (limit: 1) — return page1
      // Call 2: first data page (limit: 100) — return page1 (full batch → continue)
      // Call 3: second data page — return page2 (no nextCursor → stop)
      const pages = [page1, page1, page2];
      return Result.ok(pages[callCount - 1] ?? page2);
    });
    const repo = { list } as unknown as IAuditLog;
    const useCase = new ExportAuditLogs({ auditLog: repo });

    const r = await useCase.execute({ filters: {} });

    expect(r.ok).toBe(true);
    if (r.ok) {
      // First call: 100 entries from page1
      // Second call: 2 entries from page2
      expect(r.entries).toHaveLength(102);
      expect(callCount).toBe(3);
    }
  });

  it("propagates db_error when repo list fails", async () => {
    const dbError: AuditLogError = { kind: "db_error", message: "connection lost" };
    const list = vi.fn(async (): ReturnType<ListFn> => Result.err(dbError));
    const repo = { list } as unknown as IAuditLog;
    const useCase = new ExportAuditLogs({ auditLog: repo });

    const r = await useCase.execute({ filters: {} });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("db_error");
    }
  });

  it("returns empty entries when repo has no data", async () => {
    const emptyPage: AuditLogPage = {
      entries: [],
      nextCursor: null,
      total: 0,
    };
    const list = vi.fn(async (): ReturnType<ListFn> => Result.ok(emptyPage));
    const repo = { list } as unknown as IAuditLog;
    const useCase = new ExportAuditLogs({ auditLog: repo });

    const r = await useCase.execute({ filters: {} });

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entries).toHaveLength(0);
    }
  });
});
