import { describe, expect, it } from "vitest";
import { createRetrievalCheck } from "@/domain/entities/RetrievalCheckAttempt";

const NOW = new Date("2026-09-16T00:00:00.000Z");

function validParams() {
  return {
    id: "rc-1",
    userId: "user-1",
    lessonSlug: "lesson-1",
    checkId: "acos-check",
    correct: true,
    createdById: "user-1",
    createdAt: NOW,
  };
}

describe("createRetrievalCheck", () => {
  it("creates a log row with trimmed identifiers", () => {
    const result = createRetrievalCheck({
      ...validParams(),
      lessonSlug: "  lesson-1  ",
      checkId: "  acos-check  ",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lessonSlug).toBe("lesson-1");
    expect(result.value.checkId).toBe("acos-check");
    expect(result.value.correct).toBe(true);
    expect(result.value.deletedAt).toBeNull();
  });

  it("records an incorrect answer without complaint", () => {
    const result = createRetrievalCheck({ ...validParams(), correct: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.correct).toBe(false);
  });

  it("defaults createdAt to now when absent", () => {
    const params = validParams();
    const { createdAt: _ignored, ...withoutCreatedAt } = params;
    const result = createRetrievalCheck(withoutCreatedAt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.createdAt instanceof Date).toBe(true);
  });

  it("rejects a blank userId", () => {
    expect(createRetrievalCheck({ ...validParams(), userId: "  " })).toEqual({
      ok: false,
      error: { kind: "invalid_user_id" },
    });
  });

  it("rejects a blank lessonSlug", () => {
    expect(createRetrievalCheck({ ...validParams(), lessonSlug: "" })).toEqual({
      ok: false,
      error: { kind: "invalid_lesson_slug" },
    });
  });

  it("rejects a blank checkId", () => {
    expect(createRetrievalCheck({ ...validParams(), checkId: "  " })).toEqual({
      ok: false,
      error: { kind: "invalid_check_id" },
    });
  });
});
