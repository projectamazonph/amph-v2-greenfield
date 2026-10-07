/**
 * ListSimgridProgressForUser use case tests.
 *
 * ADR-026: SimGrid integration.
 */

import { describe, expect, it } from "vitest";

import { ListSimgridProgressForUser } from "@/usecases/simgrid/ListSimgridProgressForUser";
import { InMemorySimgridAttemptRepository } from "@/infra/repositories/__tests__/InMemorySimgridAttemptRepository";

describe("ListSimgridProgressForUser", () => {
  it("delegates to the repo and returns the user's attempts", async () => {
    const repo = new InMemorySimgridAttemptRepository();
    await repo.record({
      id: "a",
      userId: "u1",
      simulatorId: "bid-decisions",
      score: 80,
      passed: true,
      completedAt: new Date("2026-09-30T00:00:00Z"),
      scenarioVersion: "1",
      rubricVersion: "1",
    });
    const useCase = new ListSimgridProgressForUser({ simgridAttemptRepo: repo });
    const result = await useCase.execute({ userId: "u1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.id).toBe("a");
  });
});
