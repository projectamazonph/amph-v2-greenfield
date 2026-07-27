/**
 * SubmitSimulatorAttempt — transitions an in_progress attempt to submitted.
 * STORY-064.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { SubmitSimulatorAttempt } from "../SubmitSimulatorAttempt";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { FixedClock } from "@/ports/system/Clock";

function makeAttempt(overrides: { status?: "in_progress" | "submitted" | "graded" } = {}) {
  const attempt = createSimulatorAttempt({
    id: "id_1",
    attemptId: "ATT-ABC1234",
    userId: "u_1",
    simulatorId: "bid-elevator",
    scenarioId: "scn_1",
    seed: "SEED0001",
    startedAt: new Date("2025-01-15T00:00:00Z"),
  });
  if (!overrides.status || overrides.status === "in_progress") return attempt;
  return { ...attempt, status: overrides.status };
}

describe("SubmitSimulatorAttempt", () => {
  let repo: InMemorySimulatorAttemptRepository;
  let clock: FixedClock;
  let useCase: SubmitSimulatorAttempt;

  beforeEach(() => {
    repo = new InMemorySimulatorAttemptRepository();
    clock = new FixedClock(new Date("2025-01-15T12:00:00Z"));
    useCase = new SubmitSimulatorAttempt({ attemptRepo: repo, clock });
  });

  it("submits an in_progress attempt with one decision", async () => {
    // Seed: in_progress attempt with one decision
    repo.create(makeAttempt());
    await repo.addDecision("id_1", {
      id: "dec_1",
      attemptId: "id_1",
      revision: 1,
      decisionData: { bid: 1.25 },
      submittedAt: new Date(),
    });

    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe("submitted");
    expect(r.value.submittedAt).toBeInstanceOf(Date);

    const persisted = await repo.findByAttemptId("ATT-ABC1234");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok || !persisted.value) return;
    expect(persisted.value.status).toBe("submitted");
    expect(persisted.value.submittedAt).toBeInstanceOf(Date);
  });

  it("returns already_submitted on a second submit", async () => {
    repo.create(makeAttempt());
    await repo.addDecision("id_1", {
      id: "dec_1",
      attemptId: "id_1",
      revision: 1,
      decisionData: { bid: 1 },
      submittedAt: new Date(),
    });
    await useCase.execute({ attemptId: "ATT-ABC1234" });

    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("already_submitted");
  });

  it("returns attempt_not_in_progress when the attempt is graded", async () => {
    repo.create(makeAttempt({ status: "graded" }));
    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_in_progress");
  });

  it("returns no_decisions_made when submitting an empty attempt", async () => {
    repo.create(makeAttempt());
    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("no_decisions_made");
  });

  it("returns attempt_not_found when the attempt is missing", async () => {
    const r = await useCase.execute({ attemptId: "ATT-MISSING" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_found");
  });
});
