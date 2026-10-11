import { describe, it, expect } from "vitest";
import { lessonPath, moduleNumberFromSlug } from "../lessonPath";

describe("moduleNumberFromSlug", () => {
  it("parses positive module numbers", () => {
    expect(moduleNumberFromSlug("4.3-campaign-structure")).toBe(4);
    expect(moduleNumberFromSlug("11.4-client-communication-capstone")).toBe(11);
  });

  it("parses negative module numbers (Module -1)", () => {
    expect(moduleNumberFromSlug("-1.2-surfaces")).toBe(-1);
    expect(moduleNumberFromSlug("-1.1-what-amazon-is")).toBe(-1);
  });

  it("returns null for malformed slugs", () => {
    expect(moduleNumberFromSlug("not-a-lesson-slug")).toBeNull();
    expect(moduleNumberFromSlug("")).toBeNull();
    expect(moduleNumberFromSlug("a.b-c")).toBeNull();
  });
});

describe("lessonPath", () => {
  it("resolves Module -1, 0-4 lessons to ppc-foundations", () => {
    expect(lessonPath("-1.1-what-amazon-is")).toEqual({
      path: "/courses/ppc-foundations/lessons/-1.1-what-amazon-is",
      courseSlug: "ppc-foundations",
    });
    expect(lessonPath("4.3-campaign-structure")).toEqual({
      path: "/courses/ppc-foundations/lessons/4.3-campaign-structure",
      courseSlug: "ppc-foundations",
    });
  });

  it("resolves Module 5-10 lessons to accelerated-mastery", () => {
    expect(lessonPath("6.3-bid-elevator-prep")).toEqual({
      path: "/courses/accelerated-mastery/lessons/6.3-bid-elevator-prep",
      courseSlug: "accelerated-mastery",
    });
    expect(lessonPath("10.4-clicks-no-sales-high-acos")).toEqual({
      path: "/courses/accelerated-mastery/lessons/10.4-clicks-no-sales-high-acos",
      courseSlug: "accelerated-mastery",
    });
  });

  it("resolves Module 11 lessons to ultimate-transformation", () => {
    expect(lessonPath("11.4-client-communication-capstone")).toEqual({
      path: "/courses/ultimate-transformation/lessons/11.4-client-communication-capstone",
      courseSlug: "ultimate-transformation",
    });
  });

  it("returns both null fields for null/undefined/malformed input", () => {
    expect(lessonPath(null)).toEqual({ path: null, courseSlug: null });
    expect(lessonPath(undefined)).toEqual({ path: null, courseSlug: null });
    expect(lessonPath("")).toEqual({ path: null, courseSlug: null });
    expect(lessonPath("not-a-slug")).toEqual({ path: null, courseSlug: null });
  });
});