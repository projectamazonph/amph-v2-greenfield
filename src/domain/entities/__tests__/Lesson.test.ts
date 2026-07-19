/**
 * Lesson.test.ts — STORY-048c. Entity factory + content validation.
 */

import { describe, it, expect } from "vitest";
import {
  createLesson,
  updateLesson,
  validateLessonContent,
} from "@/domain/entities/Lesson";

describe("Lesson entity", () => {
  // ── createLesson ─────────────────────────────────────

  it("creates a valid TEXT lesson", () => {
    const r = createLesson({
      id: "l1",
      moduleId: "m1",
      title: "Intro",
      type: "TEXT",
      content: { body: "Hello" },
      displayOrder: 1,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe("Intro");
  });

  it("rejects an empty id", () => {
    const r = createLesson({
      id: "   ",
      moduleId: "m1",
      title: "X",
      type: "TEXT",
      content: { body: "hi" },
      displayOrder: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("rejects an empty moduleId", () => {
    const r = createLesson({
      id: "l1",
      moduleId: "",
      title: "X",
      type: "TEXT",
      content: { body: "hi" },
      displayOrder: 1,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects an empty title", () => {
    const r = createLesson({
      id: "l1",
      moduleId: "m1",
      title: "",
      type: "TEXT",
      content: { body: "hi" },
      displayOrder: 1,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects displayOrder < 1", () => {
    const r = createLesson({
      id: "l1",
      moduleId: "m1",
      title: "X",
      type: "TEXT",
      content: { body: "hi" },
      displayOrder: 0,
    });
    expect(r.ok).toBe(false);
  });

  // ── validateLessonContent ────────────────────────────

  describe("validateLessonContent", () => {
    it("validates a valid VIDEO content", () => {
      const r = validateLessonContent("VIDEO", { durationMinutes: 5 });
      expect(r.ok).toBe(true);
    });

    it("rejects VIDEO with non-positive durationMinutes", () => {
      expect(validateLessonContent("VIDEO", { durationMinutes: 0 }).ok).toBe(false);
      expect(validateLessonContent("VIDEO", { durationMinutes: -1 }).ok).toBe(false);
      expect(validateLessonContent("VIDEO", { durationMinutes: "5" }).ok).toBe(false);
    });

    it("validates a valid TEXT content", () => {
      const r = validateLessonContent("TEXT", { body: "Hello" });
      expect(r.ok).toBe(true);
    });

    it("rejects TEXT with empty body", () => {
      const r = validateLessonContent("TEXT", { body: "   " });
      expect(r.ok).toBe(false);
    });

    it("rejects TEXT without body", () => {
      const r = validateLessonContent("TEXT", {});
      expect(r.ok).toBe(false);
    });

    it("validates a valid QUIZ content", () => {
      const r = validateLessonContent("QUIZ", {
        questions: [
          { id: "q1", prompt: "P", options: ["a", "b"], correctOptionIndex: 0 },
        ],
      });
      expect(r.ok).toBe(true);
    });

    it("rejects QUIZ with no questions", () => {
      const r = validateLessonContent("QUIZ", { questions: [] });
      expect(r.ok).toBe(false);
    });

    it("rejects QUIZ with fewer than 2 options", () => {
      const r = validateLessonContent("QUIZ", {
        questions: [
          { id: "q1", prompt: "P", options: ["only"], correctOptionIndex: 0 },
        ],
      });
      expect(r.ok).toBe(false);
    });

    it("rejects QUIZ with out-of-range correctOptionIndex", () => {
      const r = validateLessonContent("QUIZ", {
        questions: [
          { id: "q1", prompt: "P", options: ["a", "b"], correctOptionIndex: 5 },
        ],
      });
      expect(r.ok).toBe(false);
    });

    it("rejects non-object content", () => {
      expect(validateLessonContent("VIDEO", "not an object").ok).toBe(false);
      expect(validateLessonContent("TEXT", null).ok).toBe(false);
      expect(validateLessonContent("QUIZ", []).ok).toBe(false);
    });
  });

  // ── updateLesson ─────────────────────────────────────

  it("updateLesson preserves the type when not patched", () => {
    const orig = createLesson({
      id: "l1",
      moduleId: "m1",
      title: "X",
      type: "VIDEO",
      content: { durationMinutes: 5 },
      displayOrder: 1,
    });
    expect(orig.ok).toBe(true);
    if (!orig.ok) return;

    const r = updateLesson(orig.value, { title: "Y" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe("Y");
    expect(r.value.type).toBe("VIDEO");
  });

  it("updateLesson re-validates content when type changes", () => {
    const orig = createLesson({
      id: "l1",
      moduleId: "m1",
      title: "X",
      type: "TEXT",
      content: { body: "hi" },
      displayOrder: 1,
    });
    expect(orig.ok).toBe(true);
    if (!orig.ok) return;

    // Try to switch to QUIZ but with TEXT-shaped content
    const r = updateLesson(orig.value, {
      type: "QUIZ",
      content: { body: "hi" },
    });
    expect(r.ok).toBe(false);
  });
});
