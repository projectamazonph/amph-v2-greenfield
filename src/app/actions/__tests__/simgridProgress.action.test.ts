import { describe, it, expect, vi } from "vitest";

// The action file imports getSessionUserId from @/lib/auth, which marks
// itself as server-only. Vitest's node environment has no Server Component
// context, so we stub the guard — same pattern as createQuiz.action.test.ts.
vi.mock("server-only", () => ({}));

import { performRecordSimgridProgress } from "@/app/actions/simgridProgress.action";
import { buildTestContainer } from "@/composition/container.test";

const baseAttempt = {
  simulatorId: "bid-decisions" as const,
  scenarioVersion: "1",
  rubricVersion: "1",
  score: 80,
  passed: true,
  completedAt: new Date().toISOString(),
};

describe("performRecordSimgridProgress", () => {
  it("records a valid attempt for an authenticated user", async () => {
    const container = buildTestContainer();
    const r = await performRecordSimgridProgress(container, { attempt: baseAttempt }, async () => ({
      id: "u1",
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(typeof r.value.id).toBe("string");
    expect(typeof r.value.recordedAt).toBe("string");
  });

  it("returns unauthenticated when no session user", async () => {
    const container = buildTestContainer();
    const r = await performRecordSimgridProgress(
      container,
      { attempt: baseAttempt },
      async () => null,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("unauthenticated");
  });

  it("returns invalid_input for out-of-range score", async () => {
    const container = buildTestContainer();
    const r = await performRecordSimgridProgress(
      container,
      { attempt: { ...baseAttempt, score: 200 } },
      async () => ({ id: "u1" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input for unknown simulator id", async () => {
    const container = buildTestContainer();
    const r = await performRecordSimgridProgress(
      container,
      { attempt: { ...baseAttempt, simulatorId: "not-real" as never } },
      async () => ({ id: "u1" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input for non-boolean passed", async () => {
    const container = buildTestContainer();
    const r = await performRecordSimgridProgress(
      container,
      { attempt: { ...baseAttempt, passed: "yes" as never } },
      async () => ({ id: "u1" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input for non-ISO completedAt", async () => {
    const container = buildTestContainer();
    const r = await performRecordSimgridProgress(
      container,
      { attempt: { ...baseAttempt, completedAt: "yesterday" } },
      async () => ({ id: "u1" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });
});
