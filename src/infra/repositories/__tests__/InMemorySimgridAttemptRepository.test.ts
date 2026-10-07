/**
 * InMemorySimgridAttemptRepository tests.
 *
 * ADR-026: SimGrid integration.
 */

import { describe, it, expect } from "vitest";

import { InMemorySimgridAttemptRepository } from "./InMemorySimgridAttemptRepository";
import type { SimgridAttempt } from "@/domain/simgrid";

const base: SimgridAttempt = {
  id: "01J0000000000000000000000",
  userId: "u1",
  simulatorId: "bid-decisions",
  score: 80,
  passed: true,
  completedAt: new Date("2026-09-30T00:00:00Z"),
  scenarioVersion: "1",
  rubricVersion: "1",
};

describe("InMemorySimgridAttemptRepository", () => {
  it("records and lists attempts newest-first", async () => {
    const repo = new InMemorySimgridAttemptRepository();
    await repo.record({ ...base, id: "a", completedAt: new Date("2026-09-29T00:00:00Z") });
    await repo.record({ ...base, id: "b", completedAt: new Date("2026-09-30T00:00:00Z") });
    const list = await repo.listForUser("u1");
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.map((a) => a.id)).toEqual(["b", "a"]);
  });

  it("returns best score per simulator", async () => {
    const repo = new InMemorySimgridAttemptRepository();
    await repo.record({ ...base, id: "a", score: 60, passed: false });
    await repo.record({ ...base, id: "b", score: 90, passed: true });
    await repo.record({ ...base, id: "c", simulatorId: "ad-console", score: 50 });
    const best = await repo.getBestForUserAndSimulator("u1", "bid-decisions");
    expect(best.ok).toBe(true);
    if (!best.ok) return;
    expect(best.value?.id).toBe("b");
  });
});
