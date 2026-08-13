import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  getSessionUser: vi.fn(),
  getCatalogCourseExecute: vi.fn(),
  findQuizById: vi.fn(),
  checkCourseAccessExecute: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

const courseDetail = {
  courseId: "course-1",
  slug: "foundations",
  title: "Amazon Foundations",
};

const quiz = {
  id: "quiz-1",
  courseId: "course-1",
  title: "Foundations Knowledge Check",
  passingScore: 70,
  questions: [
    {
      id: "question-1",
      questionText: "What does ACoS stand for?",
      explanation: "It measures advertising spend against attributed sales.",
      options: [
        { id: "option-1", optionText: "Advertising Cost of Sales", isCorrect: true },
        { id: "option-2", optionText: "Average Cost of Shipping", isCorrect: false },
      ],
    },
  ],
};

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    getCatalogCourse: { execute: mocks.getCatalogCourseExecute },
    quizRepo: { findById: mocks.findQuizById },
    checkCourseAccess: { execute: mocks.checkCourseAccessExecute },
  }),
}));

import QuizPage from "../page";

describe("/courses/[slug]/quizzes/[quizId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    mocks.getCatalogCourseExecute.mockResolvedValue({ ok: true, value: courseDetail });
    mocks.findQuizById.mockResolvedValue({ ok: true, value: quiz });
    mocks.checkCourseAccessExecute.mockResolvedValue({ ok: true, value: { kind: "allowed" } });
  });

  it("renders an authorized course quiz", async () => {
    const html = renderToString(
      await QuizPage({
        params: Promise.resolve({ slug: "foundations", quizId: "quiz-1" }),
      }),
    );

    expect(html).toContain("Foundations Knowledge Check");
    expect(html).toContain("Advertising Cost of Sales");
    expect(mocks.checkCourseAccessExecute).toHaveBeenCalledWith({
      userId: "student-1",
      courseId: "course-1",
    });
  });

  it("does not render a quiz from another course", async () => {
    mocks.findQuizById.mockResolvedValue({
      ok: true,
      value: { ...quiz, courseId: "another-course" },
    });

    const html = renderToString(
      await QuizPage({
        params: Promise.resolve({ slug: "foundations", quizId: "quiz-1" }),
      }),
    );

    expect(html).toContain("Quiz not found");
    expect(html).not.toContain("Advertising Cost of Sales");
  });

  it("blocks students without full course access", async () => {
    mocks.checkCourseAccessExecute.mockResolvedValue({
      ok: true,
      value: { kind: "allowed_preview", previewLessonIds: [] },
    });

    const html = renderToString(
      await QuizPage({
        params: Promise.resolve({ slug: "foundations", quizId: "quiz-1" }),
      }),
    );

    expect(html).toContain("This quiz opens with full course access");
    expect(html).toContain("take quizzes and save your score");
    expect(html).not.toContain("Advertising Cost of Sales");
  });

  it("explains when the student's plan is below the course tier", async () => {
    mocks.checkCourseAccessExecute.mockResolvedValue({
      ok: false,
      error: {
        kind: "access_denied",
        reason: "tier",
        tier: "STARTER",
        requiredTier: "ULTIMATE",
      },
    });

    const html = renderToString(
      await QuizPage({
        params: Promise.resolve({ slug: "foundations", quizId: "quiz-1" }),
      }),
    );

    expect(html).toContain("This quiz is not included in your current plan");
    expect(html).toContain("STARTER plan");
    expect(html).toContain("ULTIMATE access");
    expect(html).not.toContain("Advertising Cost of Sales");
  });

  it("redirects signed-out students to login with a return URL", async () => {
    mocks.getSessionUser.mockResolvedValue(null);

    await expect(
      QuizPage({ params: Promise.resolve({ slug: "foundations", quizId: "quiz-1" }) }),
    ).rejects.toThrow("redirect:/login?redirect=%2Fcourses%2Ffoundations%2Fquizzes%2Fquiz-1");
  });
});
