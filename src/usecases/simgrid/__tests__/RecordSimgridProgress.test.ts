/**
 * RecordSimgridProgress use case tests.
 *
 * ADR-026: SimGrid integration. The bridge forwards summary rows
 * from the vendored static site; this use case validates and
 * persists them.
 */

import { describe, expect, it } from "vitest";

import { RecordSimgridProgress } from "@/usecases/simgrid/RecordSimgridProgress";
import { InMemorySimgridAttemptRepository } from "@/infra/repositories/__tests__/InMemorySimgridAttemptRepository";
import type { SimgridAttempt } from "@/domain/simgrid";

function build() {
  const repo = new InMemorySimgridAttemptRepository();
  // The IdGenerator port exposes three methods; the use case only
  // calls `newId`, but TypeScript's structural typing requires the
  // others to be present on the stub. Use empty-string fallbacks
  // since they are never invoked by RecordSimgridProgress.
  const useCase = new RecordSimgridProgress({
    simgridAttemptRepo: repo,
    idGen: {
      newId: () => "01J0000000000000000000000",
      paymentRef: () => "",
      receiptNumber: () => "",
    },
    clock: { now: () => new Date("2026-09-30T12:00:00Z") },
  });
  return { repo, useCase };
}

describe("RecordSimgridProgress", () => {
  it("records a valid attempt and returns the generated id", async () => {
    const { useCase, repo } = build();
    const result = await useCase.execute({
      userId: "u1",
      simulatorId: "bid-decisions",
      score: 80,
      passed: true,
      completedAt: new Date("2026-09-30T11:00:00Z"),
      scenarioVersion: "1",
      rubricVersion: "1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.value.id).toBe("string");
    expect(result.value.id.length).toBeGreaterThan(0);
    const list = await repo.listForUser("u1");
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(1);
    expect(list.value[0]?.id).toBe(result.value.id);
  });

  it("rejects out-of-range score", async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      userId: "u1",
      simulatorId: "bid-decisions",
      score: 150,
      passed: false,
      completedAt: new Date(),
      scenarioVersion: "1",
      rubricVersion: "1",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("rejects unknown simulator id", async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      userId: "u1",
      // Cast bypasses the typed input; the runtime guard must still catch it.
      simulatorId: "not-real" as unknown as SimgridAttempt["simulatorId"],
      score: 80,
      passed: true,
      completedAt: new Date(),
      scenarioVersion: "1",
      rubricVersion: "1",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });
});
