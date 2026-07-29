import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import type { Lesson } from "@/domain/entities/Course";
import { LessonContent } from "@/app/courses/[slug]/lessons/LessonContent";

/**
 * These tests verify the LessonContent component renders the correct
 * markup for each lesson type.
 *
 * Since LessonContent uses 'use client' (interactive) or is a pure server
 * component, we render it to a string and check for key DOM elements.
 */

// ── Test fixtures ─────────────────────────────────────────────

function makeLesson(type: Lesson["type"], content: unknown): Lesson {
  return {
    id: "lesson_01",
    title: "Test Lesson",
    type,
    content,
  };
}

const TEXT_LESSON = makeLesson("TEXT", {
  type: "TEXT",
  body: "# Hello\n\nThis is a **bold** paragraph.",
});

const VIDEO_LESSON_YOUTUBE = makeLesson("VIDEO", {
  type: "VIDEO",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  durationMinutes: 10,
});

const VIDEO_LESSON_VIMEO = makeLesson("VIDEO", {
  type: "VIDEO",
  videoUrl: "https://vimeo.com/123456789",
  durationMinutes: 15,
});

const VIDEO_LESSON_DIRECT = makeLesson("VIDEO", {
  type: "VIDEO",
  videoUrl: "https://cdn.example.com/video.mp4",
  durationMinutes: 20,
});

const QUIZ_LESSON = makeLesson("QUIZ", {
  type: "QUIZ",
  title: "Chapter 1 Quiz",
});

describe("LessonContent", () => {
  describe("TEXT lessons", () => {
    it("renders the markdown body content", () => {
      const html = renderToString(
        <LessonContent lesson={TEXT_LESSON} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("Hello");
      expect(html).toContain("bold");
    });

    it("renders paragraph content", () => {
      const lesson = makeLesson("TEXT", {
        type: "TEXT",
        body: "This is a regular paragraph.",
      });
      const html = renderToString(
        <LessonContent lesson={lesson} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("regular paragraph");
    });

    it("renders headings", () => {
      const lesson = makeLesson("TEXT", {
        type: "TEXT",
        body: "## Section Two\n\n### Subsection",
      });
      const html = renderToString(
        <LessonContent lesson={lesson} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("Section Two");
    });
  });

  describe("VIDEO lessons", () => {
    it("renders YouTube iframe with embed URL", () => {
      const html = renderToString(
        <LessonContent
          lesson={VIDEO_LESSON_YOUTUBE}
          courseSlug="ppc-foundations"
          lessonId="lesson-1"
        />,
      );
      expect(html).toContain("youtube.com/embed");
      expect(html).toContain("dQw4w9WgXcQ");
    });

    it("renders Vimeo iframe with embed URL", () => {
      const html = renderToString(
        <LessonContent
          lesson={VIDEO_LESSON_VIMEO}
          courseSlug="ppc-foundations"
          lessonId="lesson-1"
        />,
      );
      expect(html).toContain("player.vimeo.com/video");
      expect(html).toContain("123456789");
    });

    it("renders native video element for direct MP4 URLs", () => {
      const html = renderToString(
        <LessonContent
          lesson={VIDEO_LESSON_DIRECT}
          courseSlug="ppc-foundations"
          lessonId="lesson-1"
        />,
      );
      expect(html).toContain("<video");
      expect(html).toContain("video.mp4");
    });

    it("shows duration badge", () => {
      const html = renderToString(
        <LessonContent
          lesson={VIDEO_LESSON_YOUTUBE}
          courseSlug="ppc-foundations"
          lessonId="lesson-1"
        />,
      );
      // React may render adjacent text nodes as "10<!-- -->m"
      expect(html).toMatch(/10.*m/);
    });
  });

  describe("QUIZ lessons", () => {
    it("links to the quiz player instead of a placeholder", () => {
      const html = renderToString(
        <LessonContent lesson={QUIZ_LESSON} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("Quiz");
      // Regression: this used to render a dead "coming soon" card even
      // though QuizPlayer and the attempt API were both already built.
      expect(html.toLowerCase()).not.toContain("coming soon");
      expect(html).toContain('href="/courses/ppc-foundations/lessons/lesson-1/quiz"');
    });

    it("shows the quiz title", () => {
      const html = renderToString(
        <LessonContent lesson={QUIZ_LESSON} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("Chapter 1 Quiz");
    });
  });

  // Regression: the importers write the content blob WITHOUT repeating the
  // discriminator (`{ body }` for TEXT, `{ durationMinutes }` for VIDEO) —
  // `Lesson.type` is the authoritative column. Dispatching only on
  // `content.type` sent every seeded lesson to the "unavailable" fallback,
  // so lessons rendered with a title, a sidebar and no body at all. Every
  // fixture above happens to repeat the type inside content, which is why
  // this went unnoticed.

  describe("content blobs written by the importers", () => {
    it("renders a TEXT body when content carries no type discriminator", () => {
      const lesson = { ...makeLesson("TEXT", { body: "# Seeded heading\n\nSeeded body copy." }) };
      const html = renderToString(
        <LessonContent lesson={lesson} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("Seeded heading");
      expect(html).toContain("Seeded body copy");
      expect(html).not.toContain("unavailable");
    });

    it("renders a VIDEO lesson when content carries no type discriminator", () => {
      const lesson = makeLesson("VIDEO", {
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        durationMinutes: 12,
      });
      const html = renderToString(
        <LessonContent lesson={lesson} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
      expect(html).not.toContain("unavailable");
    });

    it("falls back to the lesson title for a QUIZ with no title in content", () => {
      const lesson = { ...makeLesson("QUIZ", {}), title: "Module 1 Knowledge Check" };
      const html = renderToString(
        <LessonContent lesson={lesson} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("Module 1 Knowledge Check");
      expect(html).toContain('href="/courses/ppc-foundations/lessons/lesson-1/quiz"');
    });
  });

  describe("unknown type", () => {
    it("renders a graceful fallback for unknown content type", () => {
      const unknownLesson = {
        ...TEXT_LESSON,
        content: { type: "PODCAST", data: "some data" }, // unknown content type
      };
      const html = renderToString(
        <LessonContent lesson={unknownLesson} courseSlug="ppc-foundations" lessonId="lesson-1" />,
      );
      expect(html).toContain("unavailable");
    });
  });
});
