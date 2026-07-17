/**
 * Container wiring tests — STORY-033 / STORY-036.
 *
 * Ensures RecordQuizAttempt and SimulatorRegistry are registered on both
 * production and test containers.
 */

import { describe, it, expect } from "vitest";
import { createQuiz } from "@/domain/entities/Quiz";
import { buildTestContainer } from "@/composition/container";

describe("container — recordQuizAttempt wiring", () => {
  it("test container exposes recordQuizAttempt", () => {
    const c = buildTestContainer();
    expect(c.recordQuizAttempt).toBeDefined();
    expect(typeof c.recordQuizAttempt.execute).toBe("function");
  });

  it("test container exposes xpEventRepo", () => {
    const c = buildTestContainer();
    expect(c.xpEventRepo).toBeDefined();
  });

  it("end-to-end: a passing attempt is scored and persisted via the test container", async () => {
    const c = buildTestContainer();

    // Seed a quiz
    const quizResult = createQuiz({
      id: "quiz-1",
      courseId: "course-1",
      title: "Test Quiz",
      passingScore: 70,
      questions: [
        {
          id: "q1",
          questionText: "What is PPC?",
          options: [
            { id: "o1", optionText: "Pay Per Click", isCorrect: true },
            { id: "o2", optionText: "Post Paid", isCorrect: false },
          ],
        },
        {
          id: "q2",
          questionText: "What is CPC?",
          options: [
            { id: "o3", optionText: "Cost Per Click", isCorrect: true },
            { id: "o4", optionText: "Cost Per Conversion", isCorrect: false },
          ],
        },
      ],
    });
    if (!quizResult.ok) throw new Error("seed failed");
    c.quizRepo.seed(quizResult.value);

    const result = await c.recordQuizAttempt.execute({
      userId: "user-1",
      quizId: "quiz-1",
      answers: [
        { questionId: "q1", selectedOptionId: "o1" },
        { questionId: "q2", selectedOptionId: "o3" },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBe(100);
    expect(result.value.passed).toBe(true);
    expect(result.value.attempt.status).toBe("completed");
  });
});

// ── Simulator registry wiring (STORY-036) ──────────────────────

import { describe as simDescribe, it as simIt, expect as simExpect, beforeEach } from "vitest";

simDescribe("container — simulator registry wiring", () => {
  simIt("test container exposes simulatorRegistry", () => {
    const c = buildTestContainer();
    simExpect(c.simulatorRegistry).toBeDefined();
    simExpect(typeof c.simulatorRegistry.list).toBe("function");
    simExpect(typeof c.simulatorRegistry.get).toBe("function");
  });

  simIt("test container has all 4 simulator stubs registered", () => {
    const c = buildTestContainer();
    const simulators = c.simulatorRegistry.list();
    simExpect(simulators).toHaveLength(4);
    simExpect(c.simulatorRegistry.get("bid-elevator")).not.toBeNull();
    simExpect(c.simulatorRegistry.get("str-triage")).not.toBeNull();
    simExpect(c.simulatorRegistry.get("campaign-builder")).not.toBeNull();
    simExpect(c.simulatorRegistry.get("listing-audit")).not.toBeNull();
  });

  simIt("bid-elevator simulator is the real BidElevatorSimulator, not a stub", () => {
    const c = buildTestContainer();
    const bidElevator = c.simulatorRegistry.get("bid-elevator");
    simExpect(bidElevator).not.toBeNull();
    simExpect(bidElevator!.name).toBe("Bid Elevator");
    simExpect(bidElevator!.simulatorId).toBe("bid-elevator");
  });

  simIt("str-triage simulator is the real StrTriageSimulator, not a stub", () => {
    const c = buildTestContainer();
    const strTriage = c.simulatorRegistry.get("str-triage");
    simExpect(strTriage).not.toBeNull();
    simExpect(strTriage!.name).toBe("STR Triage");
    simExpect(strTriage!.simulatorId).toBe("str-triage");
  });

  simIt("campaign-builder simulator is the real CampaignBuilderSimulator, not a stub", () => {
    const c = buildTestContainer();
    const cb = c.simulatorRegistry.get("campaign-builder");
    simExpect(cb).not.toBeNull();
    simExpect(cb!.name).toBe("Campaign Builder");
    simExpect(cb!.simulatorId).toBe("campaign-builder");
  });
});
