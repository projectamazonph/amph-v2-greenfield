import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));

import LegacyLessonQuizPage from "../page";

describe("legacy lesson quiz route", () => {
  it("redirects to the canonical access-controlled course quiz route", async () => {
    await expect(
      LegacyLessonQuizPage({
        params: Promise.resolve({ slug: "foundations", lessonId: "quiz-1" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/courses/foundations/quizzes/quiz-1");
  });

  it("encodes route segments before redirecting", async () => {
    await expect(
      LegacyLessonQuizPage({
        params: Promise.resolve({ slug: "course name", lessonId: "quiz/value" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/courses/course%20name/quizzes/quiz%2Fvalue");
  });
});
