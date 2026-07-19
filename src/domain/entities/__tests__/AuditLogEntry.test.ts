/**
 * AuditLogEntry.test.ts — STORY-050a.
 */

import { describe, it, expect } from "vitest";
import { createAuditLogEntry } from "@/domain/entities/AuditLogEntry";

describe("AuditLogEntry entity", () => {
  it("creates a valid entry on the happy path", () => {
    const r = createAuditLogEntry({
      id: "ale_1",
      actorId: "user_1",
      action: "course.created",
      targetType: "course",
      targetId: "course_1",
      occurredAt: new Date("2026-07-19T00:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.actorId).toBe("user_1");
    expect(r.value.action).toBe("course.created");
    expect(r.value.metadata).toEqual({});
  });

  it("preserves metadata when provided", () => {
    const r = createAuditLogEntry({
      id: "ale_1",
      actorId: "user_1",
      action: "refund.overridden",
      targetType: "order",
      targetId: "order_1",
      metadata: { overrideReason: "Goodwill", amountMinor: 1000 },
      occurredAt: new Date(),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.metadata).toEqual({
      overrideReason: "Goodwill",
      amountMinor: 1000,
    });
  });

  it("rejects empty id", () => {
    const r = createAuditLogEntry({
      id: "",
      actorId: "u",
      action: "course.created",
      targetType: "course",
      targetId: "c",
      occurredAt: new Date(),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty actorId", () => {
    const r = createAuditLogEntry({
      id: "ale_1",
      actorId: "  ",
      action: "course.created",
      targetType: "course",
      targetId: "c",
      occurredAt: new Date(),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty targetType", () => {
    const r = createAuditLogEntry({
      id: "ale_1",
      actorId: "u",
      action: "course.created",
      targetType: "",
      targetId: "c",
      occurredAt: new Date(),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty targetId", () => {
    const r = createAuditLogEntry({
      id: "ale_1",
      actorId: "u",
      action: "course.created",
      targetType: "course",
      targetId: "",
      occurredAt: new Date(),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid Date", () => {
    const r = createAuditLogEntry({
      id: "ale_1",
      actorId: "u",
      action: "course.created",
      targetType: "course",
      targetId: "c",
      occurredAt: new Date("not a date"),
    });
    expect(r.ok).toBe(false);
  });
});
