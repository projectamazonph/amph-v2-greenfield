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
      const html = renderToString(<LessonContent lesson={TEXT_LESSON} />);
      expect(html).toContain("Hello");
      expect(html).toContain("bold");
    });

    it("renders paragraph content", () => {
      const lesson = makeLesson("TEXT", {
        type: "TEXT",
        body: "This is a regular paragraph.",
      });
      const html = renderToString(<LessonContent lesson={lesson} />);
      expect(html).toContain("regular paragraph");
    });

    it("renders headings", () => {
      const lesson = makeLesson("TEXT", {
        type: "TEXT",
        body: "## Section Two\n\n### Subsection",
      });
      const html = renderToString(<LessonContent lesson={lesson} />);
      expect(html).toContain("Section Two");
    });
  });

  describe("VIDEO lessons", () => {
    it("renders YouTube iframe with embed URL", () => {
      const html = renderToString(<LessonContent lesson={VIDEO_LESSON_YOUTUBE} />);
      expect(html).toContain("youtube.com/embed");
      expect(html).toContain("dQw4w9WgXcQ");
    });

    it("renders Vimeo iframe with embed URL", () => {
      const html = renderToString(<LessonContent lesson={VIDEO_LESSON_VIMEO} />);
      expect(html).toContain("player.vimeo.com/video");
      expect(html).toContain("123456789");
    });

    it("renders native video element for direct MP4 URLs", () => {
      const html = renderToString(<LessonContent lesson={VIDEO_LESSON_DIRECT} />);
      expect(html).toContain("<video");
      expect(html).toContain("video.mp4");
    });

    it("shows duration badge", () => {
      const html = renderToString(<LessonContent lesson={VIDEO_LESSON_YOUTUBE} />);
      // React may render adjacent text nodes as "10<!-- -->m"
      expect(html).toMatch(/10.*m/);
    });
  });

  describe("QUIZ lessons", () => {
    it("renders quiz placeholder", () => {
      const html = renderToString(<LessonContent lesson={QUIZ_LESSON} />);
      expect(html).toContain("Quiz");
      expect(html).toContain("coming soon");
    });

    it("shows the quiz title", () => {
      const html = renderToString(<LessonContent lesson={QUIZ_LESSON} />);
      expect(html).toContain("Chapter 1 Quiz");
    });
  });

  describe("unknown type", () => {
    it("renders a graceful fallback for unknown content type", () => {
      const unknownLesson = {
        ...TEXT_LESSON,
        content: { type: "PODCAST", data: "some data" }, // unknown content type
      };
      const html = renderToString(<LessonContent lesson={unknownLesson} />);
      expect(html).toContain("unavailable");
    });
  });
});
