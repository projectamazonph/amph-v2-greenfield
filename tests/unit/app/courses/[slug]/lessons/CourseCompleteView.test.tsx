import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CourseCompleteView } from "@/app/courses/[slug]/lessons/CourseCompleteView";

describe("CourseCompleteView", () => {
  it("renders congratulations message", () => {
    const html = renderToString(
      <CourseCompleteView
        courseTitle="Test Course"
        totalXp={110}
        certificateUrl="/certificates/abc123"
      />,
    );
    expect(html).toContain("Test Course");
    expect(html).toContain("Congratulations");
  });

  it("shows XP earned", () => {
    const html = renderToString(
      <CourseCompleteView
        courseTitle="Amazon PPC Mastery"
        totalXp={110}
        certificateUrl="/certificates/abc123"
      />,
    );
    expect(html).toContain("110");
  });

  it("renders certificate CTA link", () => {
    const html = renderToString(
      <CourseCompleteView
        courseTitle="Course"
        totalXp={100}
        certificateUrl="/certificates/test-hash"
      />,
    );
    expect(html).toContain("/certificates/test-hash");
  });

  it("renders trophy or celebration icon", () => {
    const html = renderToString(
      <CourseCompleteView
        courseTitle="Course"
        totalXp={100}
        certificateUrl="/certificates/test"
      />,
    );
    // Should contain an SVG (celebration/trophy)
    expect(html).toContain("svg");
  });
});
