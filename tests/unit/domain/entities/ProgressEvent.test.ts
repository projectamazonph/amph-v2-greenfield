/**
 * ProgressEvent entity tests — Rule 8 (TDD compliance).
 *
 * Tests createProgressEvent factory invariants.
 */

import { describe, it, expect } from "vitest";
import { createProgressEvent, type ProgressEvent } from "@/domain/entities/ProgressEvent";

function makeEvent(
  overrides: Partial<Parameters<typeof createProgressEvent>[0]> = {},
): ProgressEvent {
  const r = createProgressEvent({
    id: "pe-1",
    userId: "u-1",
    courseId: "c-1",
    type: "lesson_completed",
    ...overrides,
  });
  if (!r.ok) throw new Error(`setup failed: ${r.error.kind}`);
  return r.value;
}

describe("ProgressEvent entity", () => {
  it("creates an event with valid params", () => {
    const r = createProgressEvent({
      id: "pe-1",
      userId: "u-1",
      courseId: "c-1",
      type: "lesson_completed",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lessonId).toBeNull();
    expect(r.value.metadata).toEqual({});
    expect(r.value.createdAt).toBeInstanceOf(Date);
  });

  it("preserves lessonId when provided", () => {
    const event = makeEvent({ lessonId: "l-42" });
    expect(event.lessonId).toBe("l-42");
  });

  it("freezes the metadata object", () => {
    const event = makeEvent({ metadata: { score: 100 } });
    expect(Object.isFrozen(event.metadata)).toBe(true);
  });

  it("rejects empty id", () => {
    const r = createProgressEvent({
      id: "  ",
      userId: "u-1",
      courseId: "c-1",
      type: "lesson_completed",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_id");
  });

  it("rejects empty userId", () => {
    const r = createProgressEvent({
      id: "pe-1",
      userId: "",
      courseId: "c-1",
      type: "lesson_completed",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_user_id");
  });

  it("rejects empty courseId", () => {
    const r = createProgressEvent({
      id: "pe-1",
      userId: "u-1",
      courseId: "  ",
      type: "lesson_completed",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_course_id");
  });

  it("accepts all 3 ProgressEventType values", () => {
    const types = ["lesson_completed", "course_started", "course_completed"] as const;
    for (const t of types) {
      const r = createProgressEvent({
        id: "pe-1",
        userId: "u-1",
        courseId: "c-1",
        type: t,
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.type).toBe(t);
    }
  });
});
