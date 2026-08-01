/**
 * LessonContent.test.tsx — render tests for the migrated lesson body component.
 *
 * Specifically validates STORY-094 (lesson-to-quiz transition wiring).
 * What we cover:
 *  - Renders TEXT lessons via react-markdown
 *  - Renders VIDEO lessons with the YouTube embed path
 *  - Renders QUIZ lessons with a "Start Quiz" link to /courses/[slug]/lessons/[id]/quiz
 *  - QUIZ lessons show a preview of the first question and the question count
 *  - Renders the "unavailable" fallback for malformed content
 *
 * TDD: this test is written first to lock in the QUIZ transition before
 * further simulator work builds on top of it.
 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Lesson } from "@/domain/entities/Lesson";
import { LessonContent } from "../LessonContent";

const courseSlug = "ppc-foundations";

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: overrides.id ?? "lesson-1",
    moduleId: "module-1",
    title: overrides.title ?? "Sample Lesson",
    type: overrides.type ?? "TEXT",
    content: overrides.content ?? { body: "Hello world" },
    displayOrder: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as Lesson;
}

describe("LessonContent (render)", () => {
  it("renders TEXT lessons through react-markdown", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: { body: "# Heading\n\nBody text" },
    });
    const html = renderToString(
      <LessonContent lesson={lesson} courseSlug={courseSlug} />,
    );
    expect(html).toContain("Heading");
    expect(html).toContain("Body text");
    // No quiz placeholder text should appear for a TEXT lesson.
    expect(html).not.toContain("Start Quiz");
  });

  it("renders VIDEO lessons with the YouTube embed iframe when the URL matches", () => {
    const lesson = makeLesson({
      type: "VIDEO",
      content: {
        durationMinutes: 12,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      } as unknown as Lesson["content"],
    });
    const html = renderToString(
      <LessonContent lesson={lesson} courseSlug={courseSlug} />,
    );
    expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
    // React renders adjacent text nodes as "12<!-- -->m" — accept either form.
    expect(html).toMatch(/12(?:<!-- -->)?m/);
    expect(html).not.toContain("Start Quiz");
  });

  it("renders the unavailable fallback for malformed content", () => {
    const lesson = makeLesson({
      type: "TEXT",
      content: { unexpectedShape: true } as unknown as Lesson["content"],
    });
    const html = renderToString(
      <LessonContent lesson={lesson} courseSlug={courseSlug} />,
    );
    expect(html).toContain("Lesson content unavailable.");
  });

  // ── STORY-094: lesson-to-quiz transition ────────────────────────

  it("renders QUIZ lessons with a Start Quiz CTA pointing at the quiz route", () => {
    const lesson = makeLesson({
      id: "quiz-lesson",
      type: "QUIZ",
      content: {
        questions: [
          {
            id: "q1",
            prompt: "What is ACoS?",
            options: ["Advertising Cost of Sales", "Average Click Order"],
            correctOptionIndex: 0,
          },
        ],
      },
    });
    const html = renderToString(
      <LessonContent lesson={lesson} courseSlug={courseSlug} />,
    );

    // CTA exists with the right link
    expect(html).toContain("Start Quiz");
    expect(html).toContain(
      `/courses/${courseSlug}/lessons/quiz-lesson/quiz`,
    );
  });

  it("shows QUIZ question count in plural form for multiple questions", () => {
    const lesson = makeLesson({
      type: "QUIZ",
      content: {
        questions: [
          { id: "q1", prompt: "Q1", options: ["a", "b"], correctOptionIndex: 0 },
          { id: "q2", prompt: "Q2", options: ["a", "b"], correctOptionIndex: 0 },
          { id: "q3", prompt: "Q3", options: ["a", "b"], correctOptionIndex: 0 },
          { id: "q4", prompt: "Q4", options: ["a", "b"], correctOptionIndex: 0 },
          { id: "q5", prompt: "Q5", options: ["a", "b"], correctOptionIndex: 0 },
        ],
      },
    });
    const html = renderToString(
      <LessonContent lesson={lesson} courseSlug={courseSlug} />,
    );
    expect(html).toContain("5 questions in this lesson");
    // Only first 2 questions preview
    expect(html).toContain("Q1");
    expect(html).toContain("Q2");
    // Tail summary line for the rest (React inserts `<!-- -->` between
    // adjacent text nodes — accept both the merged and the split form).
    expect(html).toMatch(/3(?:<!-- -->)? more/);
  });

  it("shows singular 'question' wording for a 1-question QUIZ", () => {
    const lesson = makeLesson({
      type: "QUIZ",
      content: {
        questions: [
          {
            id: "q1",
            prompt: "Only one?",
            options: ["yes", "no"],
            correctOptionIndex: 0,
          },
        ],
      },
    });
    const html = renderToString(
      <LessonContent lesson={lesson} courseSlug={courseSlug} />,
    );
    expect(html).toContain("1 question in this lesson");
    expect(html).not.toContain("1 questions");
  });

  it("replaces the 'coming soon!' placeholder text with real lesson-to-quiz wiring", () => {
    const lesson = makeLesson({
      type: "QUIZ",
      content: {
        questions: [
          { id: "q1", prompt: "Q", options: ["a", "b"], correctOptionIndex: 0 },
        ],
      },
    });
    const html = renderToString(
      <LessonContent lesson={lesson} courseSlug={courseSlug} />,
    );
    // Story-094 acceptance: the "coming soon" placeholder is gone.
    expect(html).not.toContain("coming soon");
    expect(html).not.toContain("Interactive quiz");
  });
});