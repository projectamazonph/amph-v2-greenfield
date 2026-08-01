import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import type { Lesson, LessonContent as LessonContentDomain } from "@/domain/entities/Lesson";
import { LessonContent } from "@/app/courses/[slug]/lessons/LessonContent";

/**
 * These tests verify the LessonContent component renders the correct
 * markup for each lesson type.
 *
 * Since LessonContent uses 'use client' (interactive) or is a pure server
 * component, we render it to a string and check for key DOM elements.
 */

// ── Test fixtures ─────────────────────────────────────────────

const FIXED_DATE = new Date("2026-01-01T00:00:00Z");

function makeLesson(type: Lesson["type"], content: LessonContentDomain): Lesson {
  return {
    id: "lesson_01",
    moduleId: "module-1",
    title: "Test Lesson",
    type,
    content,
    displayOrder: 1,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
  };
}

const TEXT_LESSON = makeLesson("TEXT", {
  body: "# Hello\n\nThis is a **bold** paragraph.",
} as unknown as LessonContentDomain);

const VIDEO_LESSON_YOUTUBE = makeLesson("VIDEO", {
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  durationMinutes: 10,
} as unknown as LessonContentDomain);

const VIDEO_LESSON_VIMEO = makeLesson("VIDEO", {
  videoUrl: "https://vimeo.com/123456789",
  durationMinutes: 15,
} as unknown as LessonContentDomain);

const VIDEO_LESSON_DIRECT = makeLesson("VIDEO", {
  videoUrl: "https://cdn.example.com/video.mp4",
  durationMinutes: 20,
} as unknown as LessonContentDomain);

const QUIZ_LESSON = makeLesson("QUIZ", {
  title: "Chapter 1 Quiz",
  questions: [
    {
      id: "q1",
      prompt: "What is ACoS?",
      options: ["Advertising Cost of Sales", "Average Click Order"],
      correctOptionIndex: 0,
    },
  ],
} as unknown as LessonContentDomain);

describe("LessonContent", () => {
  describe("TEXT lessons", () => {
    it("renders the markdown body content", () => {
      const html = renderToString(<LessonContent lesson={TEXT_LESSON} courseSlug="ppc-foundations" />);
      expect(html).toContain("Hello");
      expect(html).toContain("bold");
    });

    it("renders paragraph content", () => {
      const lesson = makeLesson("TEXT", {
        body: "This is a regular paragraph.",
      } as unknown as LessonContentDomain);
      const html = renderToString(<LessonContent lesson={lesson} courseSlug="ppc-foundations" />);
      expect(html).toContain("regular paragraph");
    });

    it("renders headings", () => {
      const lesson = makeLesson("TEXT", {
        body: "## Section Two\n\n### Subsection",
      } as unknown as LessonContentDomain);
      const html = renderToString(<LessonContent lesson={lesson} courseSlug="ppc-foundations" />);
      expect(html).toContain("Section Two");
    });
  });

  describe("VIDEO lessons", () => {
    it("renders YouTube iframe with embed URL", () => {
      const html = renderToString(<LessonContent lesson={VIDEO_LESSON_YOUTUBE} courseSlug="ppc-foundations" />);
      expect(html).toContain("youtube.com/embed");
      expect(html).toContain("dQw4w9WgXcQ");
    });

    it("renders Vimeo iframe with embed URL", () => {
      const html = renderToString(<LessonContent lesson={VIDEO_LESSON_VIMEO} courseSlug="ppc-foundations" />);
      expect(html).toContain("player.vimeo.com/video");
      expect(html).toContain("123456789");
    });

    it("renders native video element for direct MP4 URLs", () => {
      const html = renderToString(<LessonContent lesson={VIDEO_LESSON_DIRECT} courseSlug="ppc-foundations" />);
      expect(html).toContain("<video");
      expect(html).toContain("video.mp4");
    });

    it("shows duration badge", () => {
      const html = renderToString(<LessonContent lesson={VIDEO_LESSON_YOUTUBE} courseSlug="ppc-foundations" />);
      // React may render adjacent text nodes as "10<!-- -->m"
      expect(html).toMatch(/10.*m/);
    });
  });

  describe("QUIZ lessons", () => {
    it("renders the Start Quiz CTA linking to the quiz route", () => {
      const html = renderToString(<LessonContent lesson={QUIZ_LESSON} courseSlug="ppc-foundations" />);
      expect(html).toContain("Start Quiz");
      expect(html).toContain("/courses/ppc-foundations/lessons/lesson_01/quiz");
    });

    it("renders a question preview for the QUIZ content", () => {
      const html = renderToString(<LessonContent lesson={QUIZ_LESSON} courseSlug="ppc-foundations" />);
      expect(html).toContain("What is ACoS?");
      expect(html).toContain("1 question in this lesson");
    });
  });

  describe("unknown type", () => {
    it("renders a graceful fallback for unknown content type", () => {
      const unknownLesson: Lesson = {
        ...TEXT_LESSON,
        content: { type: "PODCAST", data: "some data" } as unknown as LessonContentDomain, // unknown content type
      };
      const html = renderToString(<LessonContent lesson={unknownLesson} courseSlug="ppc-foundations" />);
      expect(html).toContain("unavailable");
    });
  });
});
