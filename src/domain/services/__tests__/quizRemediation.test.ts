import { describe, expect, it } from "vitest";
import { buildQuizRemediationPlan, type RemediationItem } from "@/domain/services/QuizRemediation";
import { createQuiz, type Quiz } from "@/domain/entities/Quiz";
import { startQuizAttempt } from "@/domain/entities/QuizAttempt";

function buildQuiz(): Quiz {
  const result = createQuiz({
    id: "q-1",
    courseId: "course-1",
    title: "PPC quick check",
    passingScore: 70,
    questions: [
      {
        id: "q-1.1",
        questionText: "What does ACoS measure?",
        options: [
          { id: "a", optionText: "Ad spend / ad sales", isCorrect: true },
          { id: "b", optionText: "Clicks / impressions", isCorrect: false },
        ],
        remediationRefs: ["1.3-acos-tacos-profitability"],
      },
      {
        id: "q-1.2",
        questionText: "What does CTR measure?",
        options: [
          { id: "a", optionText: "Clicks / impressions", isCorrect: true },
          { id: "b", optionText: "Sales / clicks", isCorrect: false },
        ],
        remediationRefs: ["1.2-cpc-ctr"],
      },
      {
        id: "q-1.3",
        questionText: "What does ROAS measure?",
        options: [
          { id: "a", optionText: "Ad sales / ad spend", isCorrect: true },
          { id: "b", optionText: "Clicks / spend", isCorrect: false },
        ],
        remediationRefs: ["1.4-roas-measuring-return"],
      },
      {
        id: "q-1.4",
        questionText: "What does TACoS measure?",
        options: [
          { id: "a", optionText: "Total ad spend / total store sales", isCorrect: true },
          { id: "b", optionText: "Total ad spend / total ad sales", isCorrect: false },
        ],
        // LEARN-041: no remediation authored for this question yet.
        remediationRefs: [],
      },
    ],
  });
  if (!result.ok) throw new Error("test fixture: quiz build failed");
  return result.value;
}

function attemptWithAnswers(
  quiz: Quiz,
  selected: ReadonlyArray<{ questionId: string; selectedOptionId: string }>,
) {
  const start = startQuizAttempt({ id: "a-1", userId: "user-1", quizId: quiz.id });
  if (!start.ok) throw new Error("test fixture: start failed");
  let attempt = start.value;
  for (const answer of selected) {
    const answered = {
      ...attempt,
      answers: [
        ...attempt.answers.filter((a) => a.questionId !== answer.questionId),
        { questionId: answer.questionId, selectedOptionId: answer.selectedOptionId },
      ],
    };
    attempt = answered;
  }
  return attempt;
}

describe("buildQuizRemediationPlan", () => {
  it("returns no items when every question is answered correctly", () => {
    const quiz = buildQuiz();
    const attempt = attemptWithAnswers(quiz, [
      { questionId: "q-1.1", selectedOptionId: "a" },
      { questionId: "q-1.2", selectedOptionId: "a" },
      { questionId: "q-1.3", selectedOptionId: "a" },
      { questionId: "q-1.4", selectedOptionId: "a" },
    ]);
    const plan = buildQuizRemediationPlan(quiz, attempt);
    expect(plan.items).toEqual([]);
    expect(plan.distinctLessonSlugs).toEqual([]);
    expect(plan.missedCount).toBe(0);
    expect(plan.totalCount).toBe(4);
  });

  it("collects distinct lesson slugs from every missed question", () => {
    const quiz = buildQuiz();
    const attempt = attemptWithAnswers(quiz, [
      // q-1.1 wrong → 1.3-acos-tacos-profitability
      { questionId: "q-1.1", selectedOptionId: "b" },
      // q-1.2 wrong → 1.2-cpc-ctr
      { questionId: "q-1.2", selectedOptionId: "b" },
      // q-1.3 wrong → 1.4-roas-measuring-return
      { questionId: "q-1.3", selectedOptionId: "b" },
      // q-1.4 right but no remediation → no lesson added
      { questionId: "q-1.4", selectedOptionId: "a" },
    ]);
    const plan = buildQuizRemediationPlan(quiz, attempt);
    expect(plan.missedCount).toBe(3);
    expect(plan.distinctLessonSlugs).toEqual([
      "1.2-cpc-ctr",
      "1.3-acos-tacos-profitability",
      "1.4-roas-measuring-return",
    ]);
  });

  it("dedupes when two missed questions tag the same lesson", () => {
    const built = createQuiz({
      id: "q-shared",
      courseId: "course-1",
      title: "Shared tag",
      passingScore: 50,
      questions: [
        {
          id: "s-1",
          questionText: "First",
          options: [
            { id: "a", optionText: "A", isCorrect: true },
            { id: "b", optionText: "B", isCorrect: false },
          ],
          remediationRefs: ["1.3-acos-tacos-profitability"],
        },
        {
          id: "s-2",
          questionText: "Second",
          options: [
            { id: "a", optionText: "A", isCorrect: true },
            { id: "b", optionText: "B", isCorrect: false },
          ],
          remediationRefs: ["1.3-acos-tacos-profitability"],
        },
      ],
    });
    if (!built.ok) throw new Error("fixture");
    const attempt = attemptWithAnswers(built.value, [
      { questionId: "s-1", selectedOptionId: "b" },
      { questionId: "s-2", selectedOptionId: "b" },
    ]);
    const plan = buildQuizRemediationPlan(built.value, attempt);
    expect(plan.missedCount).toBe(2);
    expect(plan.distinctLessonSlugs).toEqual(["1.3-acos-tacos-profitability"]);
  });

  it("shows the missed question even when no remediation was authored", () => {
    const quiz = buildQuiz();
    const attempt = attemptWithAnswers(quiz, [
      // q-1.4 wrong, no tags
      { questionId: "q-1.4", selectedOptionId: "b" },
    ]);
    const plan = buildQuizRemediationPlan(quiz, attempt);
    expect(plan.missedCount).toBe(1);
    expect(plan.distinctLessonSlugs).toEqual([]);
    expect(plan.items[0]?.questionId).toBe("q-1.4");
    expect(plan.items[0]?.lessonSlugs).toEqual([]);
  });

  it("trims whitespace around tagged slugs", () => {
    const result = createQuiz({
      id: "q-2",
      courseId: "course-1",
      title: "Trimming",
      passingScore: 50,
      questions: [
        {
          id: "q-2.1",
          questionText: "Q",
          options: [
            { id: "a", optionText: "A", isCorrect: true },
            { id: "b", optionText: "B", isCorrect: false },
          ],
          remediationRefs: ["  1.2-cpc-ctr  ", ""],
        },
      ],
    });
    if (!result.ok) throw new Error("fixture");
    const quiz = result.value;
    const attempt = attemptWithAnswers(quiz, [{ questionId: "q-2.1", selectedOptionId: "b" }]);
    const plan = buildQuizRemediationPlan(quiz, attempt);
    expect(plan.distinctLessonSlugs).toEqual(["1.2-cpc-ctr"]);
  });

  it("rejects an empty remediationRefs gracefully", () => {
    const quiz = buildQuiz();
    const attempt = attemptWithAnswers(quiz, [{ questionId: "q-1.1", selectedOptionId: "b" }]);
    const plan = buildQuizRemediationPlan(quiz, attempt);
    const items: readonly RemediationItem[] = plan.items;
    expect(items).toHaveLength(1);
    expect(items[0]?.questionId).toBe("q-1.1");
    expect(items[0]?.lessonSlugs).toEqual(["1.3-acos-tacos-profitability"]);
  });
});
