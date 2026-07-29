/* eslint-disable no-restricted-syntax */
/**
 * /courses/[slug]/quizzes/[quizId] — page contract tests.
 *
 * A Quiz carries a courseId, never a lessonId, so the pre-existing
 * /courses/[slug]/lessons/[lessonId]/quiz route could only resolve a
 * quiz when a lesson id happened to equal a quiz id. No seeded content
 * satisfies that, which left every seeded knowledge check unreachable.
 * This route keys on the id the data model actually has.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

const STUDENT = {
  id: "u-1",
  email: "ry@example.com",
  firstName: "Ryan",
  lastName: "Dabao",
  role: "STUDENT" as const,
  totalXp: 100,
  createdAt: new Date(),
};

const ADMIN = { ...STUDENT, id: "u-admin", role: "ADMIN" as const };

const COURSE = {
  id: "course-1",
  slug: "foundations",
  title: "PPC Foundations",
  status: "PUBLISHED",
};

const QUIZ = {
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
      ],
    },
  ],
};

const mockFindEnrollment = vi.fn();
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    courseRepo: {
      findBySlug: vi.fn(async (slug: string) =>
        slug === "foundations"
          ? { ok: true, value: COURSE }
          : { ok: false, error: { kind: "not_found" } },
      ),
    },
    quizRepo: {
      findById: vi.fn(async (id: string) =>
        id === "quiz-1" ? { ok: true, value: QUIZ } : { ok: true, value: null },
      ),
    },
    enrollmentRepo: { findByUserIdAndCourseId: mockFindEnrollment },
  }),
}));

import { renderToString } from "react-dom/server";
import CourseQuizPage from "../page";

function render(params: { slug: string; quizId: string }) {
  return CourseQuizPage({ params: Promise.resolve(params) });
}

describe("/courses/[slug]/quizzes/[quizId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue(STUDENT);
    mockFindEnrollment.mockResolvedValue({ id: "e-1", status: "active" });
  });

  it("renders the quiz for an enrolled student", async () => {
    const html = renderToString(await render({ slug: "foundations", quizId: "quiz-1" }));
    expect(html).toContain("Module 1 Knowledge Check");
    expect(html).toContain("Advertising Cost of Sales");
  });

  it("shows the pass mark", async () => {
    const html = renderToString(await render({ slug: "foundations", quizId: "quiz-1" }));
    expect(html).toMatch(/Pass[\s\S]*?≥[\s\S]*?70[\s\S]*?%/);
  });

  it("links back to the course", async () => {
    const html = renderToString(await render({ slug: "foundations", quizId: "quiz-1" }));
    expect(html).toMatch(/href="\/courses\/foundations"/);
  });

  it("404s on an unknown quiz id", async () => {
    await expect(render({ slug: "foundations", quizId: "no-such" })).rejects.toThrow("notFound");
  });

  it("404s on an unknown course slug", async () => {
    await expect(render({ slug: "no-such", quizId: "quiz-1" })).rejects.toThrow("notFound");
  });

  it("asks anonymous visitors to sign in, and keeps the return path", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const html = renderToString(await render({ slug: "foundations", quizId: "quiz-1" }));
    expect(html).toContain("Sign in to take this quiz");
    expect(html).toContain("/courses/foundations/quizzes/quiz-1");
  });

  it("asks unenrolled students to enroll", async () => {
    mockFindEnrollment.mockResolvedValue(null);
    const html = renderToString(await render({ slug: "foundations", quizId: "quiz-1" }));
    expect(html).toContain("Enroll to take this quiz");
  });

  it("treats a refunded enrollment as unenrolled", async () => {
    mockFindEnrollment.mockResolvedValue({ id: "e-1", status: "refunded" });
    const html = renderToString(await render({ slug: "foundations", quizId: "quiz-1" }));
    expect(html).toContain("Enroll to take this quiz");
  });

  it("lets an admin through without an enrollment", async () => {
    mockGetSessionUser.mockResolvedValue(ADMIN);
    mockFindEnrollment.mockResolvedValue(null);
    const html = renderToString(await render({ slug: "foundations", quizId: "quiz-1" }));
    expect(html).toContain("Module 1 Knowledge Check");
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(await render({ slug: "foundations", quizId: "quiz-1" }));
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
