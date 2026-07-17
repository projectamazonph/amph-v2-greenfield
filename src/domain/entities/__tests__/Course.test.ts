/**
 * Course entity tests — TDD.
 *
 * Story 008: The Course is the core product domain object.
 *
 * KISS: Course only knows its own invariants.
 * YAGNI: No discount, no subscription-tier gating here — those belong in use cases.
 * SRP: One reason to change — the course model itself.
 * Fail Fast: Reject invalid states at construction.
 */

import { describe, it, expect } from "vitest";
import {
  createCourse,
  courseLessonCount,
  courseTotalDurationMinutes,
  courseIsAvailable,
} from "../Course";
import type { Curriculum } from "../Course";

// ── Fixtures ───────────────────────────────────────────────

const validCurriculum: Curriculum = {
  sections: [
    {
      id: "s1",
      title: "Getting Started",
      lessons: [
        { id: "l1", title: "Welcome", type: "TEXT", content: { body: "Hello" } },
      ],
    },
  ],
};

const validParams = {
  id: "course-1",
  slug: "amazon-ppc-fundamentals",
  title: "Amazon PPC Fundamentals",
  tagline: "Master Sponsored Ads from day one.",
  description: "A complete guide to Amazon PPC for Filipino VAs.",
  priceMinor: 2999_00,
  curriculum: validCurriculum,
};

// ── Tests ──────────────────────────────────────────────────

describe("Course entity", () => {
  describe("createCourse()", () => {
    it("creates a course with all fields", () => {
      const result = createCourse(validParams);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.id).toBe("course-1");
      expect(result.value.slug).toBe("amazon-ppc-fundamentals");
      expect(result.value.price.format()).toMatch(/2,?999/);
    });

    it("normalizes title and tagline (trim)", () => {
      const result = createCourse({ ...validParams, title: "  PPC Mastery  ", tagline: "  tagline  " });
      if (result.ok) {
        expect(result.value.title).toBe("PPC Mastery");
        expect(result.value.tagline).toBe("tagline");
      }
    });

    it("defaults status to DRAFT", () => {
      const result = createCourse(validParams);
      if (result.ok) expect(result.value.status).toBe("DRAFT");
    });

    it("defaults displayOrder to 0", () => {
      const result = createCourse(validParams);
      if (result.ok) expect(result.value.displayOrder).toBe(0);
    });

    it("defaults isFeatured to false", () => {
      const result = createCourse(validParams);
      if (result.ok) expect(result.value.isFeatured).toBe(false);
    });
  });

  describe("Fail Fast: invalid_slug", () => {
    const slugs = [
      { slug: "", reason: "empty" },
      { slug: "UPPERCASE", reason: "uppercase not allowed" },
      { slug: "has_underscore", reason: "underscores not allowed" },
      { slug: "has spaces", reason: "spaces not allowed" },
      { slug: "ends-with-hyphen-", reason: "can't end with hyphen" },
      { slug: "double--hyphen", reason: "double hyphens not allowed" },
    ];

    slugs.forEach(({ slug, reason }) => {
      it(`rejects slug "${slug}" (${reason})`, () => {
        const result = createCourse({ ...validParams, slug });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.kind).toBe("invalid_slug");
      });
    });

    it("accepts valid slugs", () => {
      const validSlugs = ["a", "ab", "abc123", "amazon-ppc", "a-b-c", "starts-with-hyphen"];
      validSlugs.forEach((slug) => {
        const result = createCourse({ ...validParams, slug });
        expect(result.ok, `slug "${slug}" should be valid`).toBe(true);
      });
    });
  });

  describe("Fail Fast: invalid_price", () => {
    it("rejects negative priceMinor", () => {
      const result = createCourse({ ...validParams, priceMinor: -1 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_price");
    });

    it("accepts zero price (free course)", () => {
      const result = createCourse({ ...validParams, priceMinor: 0 });
      expect(result.ok).toBe(true);
    });
  });

  describe("Fail Fast: invalid_curriculum", () => {
    it("rejects empty sections array", () => {
      const result = createCourse({ ...validParams, curriculum: { sections: [] } });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_curriculum");
    });

    it("rejects section with no lessons", () => {
      const result = createCourse({
        ...validParams,
        curriculum: { sections: [{ id: "s1", title: "Empty", lessons: [] }] },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_curriculum");
    });
  });

  describe("courseLessonCount()", () => {
    it("counts all lessons across all sections", () => {
      const result = createCourse({
        ...validParams,
        curriculum: {
          sections: [
            {
              id: "s1",
              title: "Intro",
              lessons: [
                { id: "l1", title: "A", type: "TEXT", content: {} },
                { id: "l2", title: "B", type: "VIDEO", content: { durationMinutes: 5 } },
              ],
            },
            {
              id: "s2",
              title: "Advanced",
              lessons: [{ id: "l3", title: "C", type: "QUIZ", content: {} }],
            },
          ],
        },
      });
      if (result.ok) expect(courseLessonCount(result.value)).toBe(3);
    });
  });

  describe("courseTotalDurationMinutes()", () => {
    it("sums video lesson durations", () => {
      const result = createCourse({
        ...validParams,
        curriculum: {
          sections: [
            {
              id: "s1",
              title: "Videos",
              lessons: [
                { id: "l1", title: "Intro", type: "VIDEO", content: { durationMinutes: 10 } },
                { id: "l2", title: "Setup", type: "VIDEO", content: { durationMinutes: 15 } },
                { id: "l3", title: "Text Note", type: "TEXT", content: {} },
              ],
            },
          ],
        },
      });
      if (result.ok) expect(courseTotalDurationMinutes(result.value)).toBe(25);
    });

    it("returns 0 for text-only course", () => {
      const result = createCourse({
        ...validParams,
        curriculum: {
          sections: [
            { id: "s1", title: "Reading", lessons: [{ id: "l1", title: "Ch1", type: "TEXT", content: {} }] },
          ],
        },
      });
      if (result.ok) expect(courseTotalDurationMinutes(result.value)).toBe(0);
    });
  });

  describe("courseIsAvailable()", () => {
    it("returns false for DRAFT course", () => {
      const result = createCourse({ ...validParams, status: "DRAFT" });
      if (result.ok) expect(courseIsAvailable(result.value)).toBe(false);
    });

    it("returns true for PUBLISHED course", () => {
      const result = createCourse({ ...validParams, status: "PUBLISHED" });
      if (result.ok) expect(courseIsAvailable(result.value)).toBe(true);
    });

    it("returns false for ARCHIVED course", () => {
      const result = createCourse({ ...validParams, status: "ARCHIVED" });
      if (result.ok) expect(courseIsAvailable(result.value)).toBe(false);
    });
  });
});
