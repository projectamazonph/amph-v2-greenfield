/**
 * SaveSimulatorDecision — appends a decision to an in_progress attempt.
 * STORY-064.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { SaveSimulatorDecision } from "../SaveSimulatorDecision";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { submitAttempt } from "@/domain/entities/SimulatorAttempt";

function makeAttempt(status: "in_progress" | "submitted" | "graded" = "in_progress") {
  const attempt = createSimulatorAttempt({
    id: "id_1",
    attemptId: "ATT-ABC1234",
    userId: "u_1",
    simulatorId: "bid-elevator",
    scenarioId: "scn_1",
    seed: "SEED0001",
    startedAt: new Date("2025-01-15T00:00:00Z"),
  });
  if (status === "in_progress") return attempt;
  if (status === "submitted") {
    // Submit requires at least one decision in the repo to succeed; bypass
    // by manually crafting the state via the in-memory repo transition.
    const transitioned = submitAttempt(attempt, new Date("2025-01-15T12:00:00Z"));
    if (!transitioned.ok) throw new Error("transition failed");
    return transitioned.value;
  }
  // graded — exercise by going through the repo's updateStatus path
  return { ...attempt, status: "graded" as const };
}

describe("SaveSimulatorDecision", () => {
  let repo: InMemorySimulatorAttemptRepository;
  let useCase: SaveSimulatorDecision;

  beforeEach(() => {
    repo = new InMemorySimulatorAttemptRepository();
    useCase = new SaveSimulatorDecision({ attemptRepo: repo });
  });

  it("appends a decision with revision 1 to an empty attempt", async () => {
    repo.create(makeAttempt());
    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      decisionData: { bid: 1.25 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.attemptId).toBe("ATT-ABC1234");
    expect(r.value.revision).toBe(1);
    expect(r.value.decisionData).toEqual({ bid: 1.25 });
    expect(r.value.savedAt).toBeInstanceOf(Date);

    const persisted = await repo.findByAttemptId("ATT-ABC1234");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok || !persisted.value) return;
    expect(persisted.value.decisions).toHaveLength(1);
    expect(persisted.value.decisions[0]?.revision).toBe(1);
  });

  it("increments revision on each saved decision", async () => {
    repo.create(makeAttempt());
    await useCase.execute({ attemptId: "ATT-ABC1234", decisionData: { bid: 1 } });
    const r2 = await useCase.execute({ attemptId: "ATT-ABC1234", decisionData: { bid: 2 } });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.revision).toBe(2);

    const persisted = await repo.findByAttemptId("ATT-ABC1234");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok || !persisted.value) return;
    expect(persisted.value.decisions).toHaveLength(2);
    expect(persisted.value.decisions.map((d) => d.revision)).toEqual([1, 2]);
  });

  it("returns attempt_not_found when the attempt is missing", async () => {
    const r = await useCase.execute({
      attemptId: "ATT-MISSING",
      decisionData: { bid: 1 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_found");
  });

  it("returns attempt_not_in_progress when the attempt is submitted", async () => {
    repo.create(makeAttempt("submitted"));
    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      decisionData: { bid: 1 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_in_progress");
  });

  it("returns empty_submission when decisionData has no keys", async () => {
    repo.create(makeAttempt());
    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      decisionData: {},
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("empty_submission");
  });

  it("blocks saves after the attempt has been submitted", async () => {
    repo.create(makeAttempt());
    await useCase.execute({ attemptId: "ATT-ABC1234", decisionData: { bid: 1 } });

    // Submit through the repo's transition (bypasses the no-decisions guard)
    const submitted = await repo.updateStatus("id_1", "submitted", {
      submittedAt: new Date("2025-01-15T12:00:00Z"),
    });
    expect(submitted.ok).toBe(true);

    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      decisionData: { bid: 2 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_in_progress");
  });
});
