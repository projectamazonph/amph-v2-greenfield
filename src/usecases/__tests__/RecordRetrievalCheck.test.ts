import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";

function input(overrides: Record<string, unknown> = {}) {
  return {
    actorId: "user-1",
    lessonSlug: "lesson-1",
    checkId: "acos-check",
    correct: true,
    ...overrides,
  };
}

describe("RecordRetrievalCheck", () => {
  it("records one attempt row", async () => {
    const c = buildTestContainer();
    const result = await c.recordRetrievalCheck.execute(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe("user-1");
    expect(result.value.lessonSlug).toBe("lesson-1");
    expect(result.value.checkId).toBe("acos-check");
    expect(result.value.correct).toBe(true);
  });

  it("records an incorrect answer the same way (never blocks)", async () => {
    const c = buildTestContainer();
    const result = await c.recordRetrievalCheck.execute(input({ correct: false }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.correct).toBe(false);
  });

  it("lists attempts back per lesson", async () => {
    const c = buildTestContainer();
    await c.recordRetrievalCheck.execute(input({ checkId: "check-a", correct: true }));
    await c.recordRetrievalCheck.execute(input({ checkId: "check-b", correct: false }));
    const listed = await c.retrievalCheckRepo.listByUserAndLesson("user-1", "lesson-1");
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.map((a) => a.checkId)).toEqual(["check-a", "check-b"]);
  });

  it("rejects a blank checkId", async () => {
    const c = buildTestContainer();
    const result = await c.recordRetrievalCheck.execute(input({ checkId: "  " }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_check_id");
  });
});
