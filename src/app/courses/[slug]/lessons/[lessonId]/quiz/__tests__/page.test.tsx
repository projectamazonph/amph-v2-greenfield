/* eslint-disable no-restricted-syntax */
/**
 * /courses/[slug]/lessons/[lessonId]/quiz — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

const mockUser = {
  id: "u-1",
  email: "ry@example.com",
  firstName: "Ryan",
  lastName: "Dabao",
  role: "student" as const,
  subscriptionTier: "mastery" as const,
  totalXp: 100,
  createdAt: new Date(),
};

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(async () => mockUser),
}));

const mockQuiz = {
  id: "quiz-1",
  courseId: "course-1",
  title: "Module 1 Knowledge Check",
  passingScore: 70,
  questions: [
    {
      id: "q1",
      questionText: "What does ACoS stand for?",
      options: [
        { id: "a", optionText: "Advertising Cost of Sales" },
        { id: "b", optionText: "Average Cost of Shipping" },
        { id: "c", optionText: "Annual Cost of Stocking" },
      ],
    },
    {
      id: "q2",
      questionText: "Which bid strategy aims to hit a target ACoS?",
      options: [
        { id: "a", optionText: "Dynamic bids" },
        { id: "b", optionText: "Fixed bids" },
        { id: "c", optionText: "Manual bids" },
      ],
    },
  ],
};

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    quizRepo: {
      findById: vi.fn(async (id: string) =>
        id === "quiz-1"
          ? { ok: true, value: mockQuiz }
          : { ok: true, value: null },
      ),
    },
  }),
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import QuizPage from "../page";

describe("/courses/[slug]/lessons/[lessonId]/quiz", () => {
  it("renders the quiz title and first question", async () => {
    const html = renderToString(
      await QuizPage({ params: Promise.resolve({ slug: "foundations", lessonId: "quiz-1" }) }),
    );
    expect(html).toContain("Module 1 Knowledge Check");
    expect(html).toContain("ACoS");
    expect(html).toContain("Advertising Cost of Sales");
  });

  it("shows progress and pass mark", async () => {
    const html = renderToString(
      await QuizPage({ params: Promise.resolve({ slug: "foundations", lessonId: "quiz-1" }) }),
    );
    // React inserts a comment between adjacent text nodes, so
    // "Question 1 of 2" and "Pass ≥ 70%" are both split. Match
    // each piece separately.
    expect(html).toMatch(/Question[\s\S]*?1[\s\S]*?of[\s\S]*?2/);
    expect(html).toMatch(/Pass[\s\S]*?≥[\s\S]*?70[\s\S]*?%/);
  });

  it("links back to the lesson page", async () => {
    const html = renderToString(
      await QuizPage({ params: Promise.resolve({ slug: "foundations", lessonId: "quiz-1" }) }),
    );
    expect(html).toMatch(/href="\/courses\/foundations\/lessons\/quiz-1"/);
  });

  it("shows 'Quiz not found' when the quiz id does not exist", async () => {
    const html = renderToString(
      await QuizPage({ params: Promise.resolve({ slug: "foundations", lessonId: "no-such" }) }),
    );
    expect(html).toContain("Quiz not found");
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(
      await QuizPage({ params: Promise.resolve({ slug: "foundations", lessonId: "quiz-1" }) }),
    );
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
