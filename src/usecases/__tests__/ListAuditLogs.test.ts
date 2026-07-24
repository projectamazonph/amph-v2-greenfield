/**
 * ListAuditLogs.test.ts — STORY-061 TDD.
 *
 * The use case is a thin pass-through to the repo. Tests verify:
 * - correct filter passthrough
 * - correct return shape
 * - error propagation
 */

import { describe, it, expect } from "vitest";
import { ListAuditLogs } from "@/usecases/ListAuditLogs";
import type { IAuditLog, AuditLogPage, AuditLogFilters } from "@/ports/repositories/IAuditLog";
import { Result } from "@/domain/shared/Result";

function makeFakeRepo(page: AuditLogPage | null = null): IAuditLog {
  return {
    list: async (_filters: AuditLogFilters) => {
      if (page === null) {
        return Result.err({ kind: "db_error", message: "store unavailable" });
      }
      return Result.ok(page);
    },
  } as unknown as IAuditLog;
}

describe("ListAuditLogs", () => {
  it("returns the page from the repo on the happy path", async () => {
    const mockPage: AuditLogPage = {
      entries: [],
      nextCursor: null,
      total: 0,
    };
    const repo = makeFakeRepo(mockPage);
    const useCase = new ListAuditLogs({ auditLog: repo });

    const r = await useCase.execute({ filters: {} });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toBe(mockPage);
  });

  it("passes filters through to the repo", async () => {
    let receivedFilters: AuditLogFilters | null = null;
    const repo: IAuditLog = {
      list: async (filters: AuditLogFilters) => {
        receivedFilters = filters;
        return Result.ok({ entries: [], nextCursor: null, total: 0 });
      },
    } as unknown as IAuditLog;
    const useCase = new ListAuditLogs({ auditLog: repo });

    await useCase.execute({
      filters: {
        actorId: "admin_1",
        action: "course.created",
        targetType: "course",
        targetId: "c1",
        from: new Date("2026-07-01"),
        to: new Date("2026-07-31"),
        cursor: "2026-07-01T00:00:00.000Z:ale_xyz",
        limit: 25,
      },
    });

    expect(receivedFilters).toMatchObject({
      actorId: "admin_1",
      action: "course.created",
      targetType: "course",
      targetId: "c1",
      from: new Date("2026-07-01"),
      to: new Date("2026-07-31"),
      cursor: "2026-07-01T00:00:00.000Z:ale_xyz",
      limit: 25,
    });
  });

  it("propagates db_error from the repo", async () => {
    const repo = makeFakeRepo(null);
    const useCase = new ListAuditLogs({ auditLog: repo });

    const r = await useCase.execute({ filters: {} });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns the total from the repo", async () => {
    const mockPage: AuditLogPage = {
      entries: [],
      nextCursor: "2026-07-01T00:00:00.000Z:ale_3",
      total: 99,
    };
    const repo = makeFakeRepo(mockPage);
    const useCase = new ListAuditLogs({ auditLog: repo });

    const r = await useCase.execute({ filters: { limit: 10 } });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.total).toBe(99);
    expect(r.value.nextCursor).toBe("2026-07-01T00:00:00.000Z:ale_3");
  });
});
