import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";
import { createQuiz } from "@/domain/entities/Quiz";

function makeQuiz() {
  const result = createQuiz({
    id: "quiz-1",
    courseId: "course-1",
    title: "Quick check",
    passingScore: 70,
    questions: [
      {
        id: "q-1",
        questionText: "ACoS?",
        options: [
          { id: "a", optionText: "Ad spend / ad sales", isCorrect: true },
          { id: "b", optionText: "Clicks / impressions", isCorrect: false },
        ],
        remediationRefs: ["1.3-acos-tacos-profitability"],
      },
      {
        id: "q-2",
        questionText: "ROAS?",
        options: [
          { id: "a", optionText: "Ad sales / ad spend", isCorrect: true },
          { id: "b", optionText: "Clicks / spend", isCorrect: false },
        ],
        remediationRefs: ["1.4-roas-measuring-return"],
      },
    ],
  });
  if (!result.ok) throw new Error("fixture");
  return result.value;
}

function buildUseCase() {
  const c = buildTestContainer();
  // The stub policy denies by default; allow everything for these tests.
  c.accessPolicy.stubDecision = { kind: "allowed" };
  return { useCase: c.recordQuizAttempt, quizRepo: c.quizRepo, accessPolicy: c.accessPolicy };
}

describe("RecordQuizAttempt — remediation (LEARN-041)", () => {
  it("returns the remediation plan on a failed attempt", async () => {
    const { useCase, quizRepo, accessPolicy } = buildUseCase();
    accessPolicy.stubDecision = { kind: "allowed" };
    const quiz = makeQuiz();
    quizRepo.seed(quiz);
    const result = await useCase.execute({
      userId: "user-1",
      quizId: quiz.id,
      answers: [
        { questionId: "q-1", selectedOptionId: "b" },
        { questionId: "q-2", selectedOptionId: "b" },
      ],
    });
    if (!result.ok) {
      console.error("unexpected", result.error);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.remediation).not.toBeNull();
    const plan = result.value.remediation!;
    expect(plan.missedCount).toBe(2);
    expect(plan.distinctLessonSlugs).toEqual([
      "1.3-acos-tacos-profitability",
      "1.4-roas-measuring-return",
    ]);
  });

  it("returns a null remediation on an in-progress attempt", async () => {
    const { useCase, quizRepo, accessPolicy } = buildUseCase();
    accessPolicy.stubDecision = { kind: "allowed" };
    const quiz = makeQuiz();
    quizRepo.seed(quiz);
    const result = await useCase.execute({
      userId: "user-1",
      quizId: quiz.id,
      answers: [{ questionId: "q-1", selectedOptionId: "a" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.remediation).toBeNull();
  });

  it("returns an empty plan when every question is correct", async () => {
    const { useCase, quizRepo, accessPolicy } = buildUseCase();
    accessPolicy.stubDecision = { kind: "allowed" };
    const quiz = makeQuiz();
    quizRepo.seed(quiz);
    const result = await useCase.execute({
      userId: "user-1",
      quizId: quiz.id,
      answers: [
        { questionId: "q-1", selectedOptionId: "a" },
        { questionId: "q-2", selectedOptionId: "a" },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.remediation).not.toBeNull();
    expect(result.value.remediation!.items).toEqual([]);
  });
});
