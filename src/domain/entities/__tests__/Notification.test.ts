import { describe, expect, it } from "vitest";
import {
  createNotification,
  isNotificationType,
  markNotificationRead,
} from "@/domain/entities/Notification";

const NOW = new Date("2026-09-16T00:00:00.000Z");

function validParams() {
  return {
    id: "n-1",
    userId: "user-1",
    type: "course_complete",
    title: "Course complete",
    body: "You finished PPC Foundations.",
    href: "/certificates",
    createdById: "system",
    createdAt: NOW,
  };
}

describe("isNotificationType", () => {
  it("accepts the five types and rejects anything else", () => {
    for (const type of [
      "course_complete",
      "artefact_submitted",
      "enrollment_welcome",
      "refund_requested",
      "announcement",
    ]) {
      expect(isNotificationType(type)).toBe(true);
    }
    expect(isNotificationType("email")).toBe(false);
    expect(isNotificationType("")).toBe(false);
  });
});

describe("createNotification", () => {
  it("creates an unread notification with trimmed fields", () => {
    const result = createNotification({ ...validParams(), title: "  Padded  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe("Padded");
    expect(result.value.readAt).toBeNull();
  });

  it("accepts a null href", () => {
    const result = createNotification({ ...validParams(), href: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.href).toBeNull();
  });

  it("defaults createdAt to now when absent", () => {
    const params = validParams();
    const { createdAt: _ignored, ...withoutCreatedAt } = params;
    const result = createNotification(withoutCreatedAt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.createdAt instanceof Date).toBe(true);
  });

  it("rejects a blank userId", () => {
    expect(createNotification({ ...validParams(), userId: "  " })).toEqual({
      ok: false,
      error: { kind: "invalid_user_id" },
    });
  });

  it("rejects an unknown type", () => {
    expect(createNotification({ ...validParams(), type: "sms" })).toEqual({
      ok: false,
      error: { kind: "invalid_type" },
    });
  });

  it("rejects a blank title", () => {
    expect(createNotification({ ...validParams(), title: "" })).toEqual({
      ok: false,
      error: { kind: "invalid_title" },
    });
  });

  it("rejects a blank body", () => {
    expect(createNotification({ ...validParams(), body: "   " })).toEqual({
      ok: false,
      error: { kind: "invalid_body" },
    });
  });
});

describe("markNotificationRead", () => {
  it("marks an unread notification read", () => {
    const created = createNotification(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const read = markNotificationRead(created.value, { readById: "user-1", readAt: NOW });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.value.readAt).toEqual(NOW);
  });

  it("rejects a non-owner", () => {
    const created = createNotification(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(markNotificationRead(created.value, { readById: "user-9", readAt: NOW })).toEqual({
      ok: false,
      error: { kind: "not_owner" },
    });
  });

  it("rejects an already-read row", () => {
    const created = createNotification(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const once = markNotificationRead(created.value, { readById: "user-1", readAt: NOW });
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    expect(markNotificationRead(once.value, { readById: "user-1", readAt: NOW })).toEqual({
      ok: false,
      error: { kind: "already_read" },
    });
  });
});
