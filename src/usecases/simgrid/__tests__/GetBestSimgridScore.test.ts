/**
 * GetBestSimgridScore use case tests.
 *
 * ADR-026: SimGrid integration.
 */

import { describe, expect, it } from "vitest";

import { GetBestSimgridScore } from "@/usecases/simgrid/GetBestSimgridScore";
import { InMemorySimgridAttemptRepository } from "@/infra/repositories/__tests__/InMemorySimgridAttemptRepository";

describe("GetBestSimgridScore", () => {
  it("returns null when the user has no attempts for the simulator", async () => {
    const repo = new InMemorySimgridAttemptRepository();
    const useCase = new GetBestSimgridScore({ simgridAttemptRepo: repo });
    const result = await useCase.execute({
      userId: "u1",
      simulatorId: "bid-decisions",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });
});
