import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { CourseCover, getCourseCoverImage } from "../CourseCover";

describe("CourseCover", () => {
  it("uses authored course artwork when a course has no uploaded cover", () => {
    expect(getCourseCoverImage("ppc-foundations", null)).toBe("/courses/ppc-foundations.png");
  });

  it("keeps an explicitly authored cover image", () => {
    expect(getCourseCoverImage("ppc-foundations", "https://cdn.example/cover.jpg")).toBe(
      "https://cdn.example/cover.jpg",
    );
  });

  it("uses a real academy image for an unknown course slug", () => {
    expect(getCourseCoverImage("future-course", null)).toBe(
      "/brand/photography/field-desk-hero.png",
    );
  });

  // L-07: the course title is rendered as the adjacent heading on both the
  // catalog card and the detail page, so duplicating it as alt text would
  // read the title twice through a screen reader. The cover image is marked
  // decorative (alt="" + role="presentation"); sighted users still see the
  // artwork, assistive tech skips the redundant announcement.
  it("marks the cover image as decorative because the title is rendered as the adjacent heading", () => {
    const html = renderToString(
      <CourseCover title="PPC Foundations" slug="ppc-foundations" coverImage={null} />,
    );

    expect(html).toContain('src="/courses/ppc-foundations.png"');
    expect(html).toContain('alt=""');
    expect(html).toContain('role="presentation"');
    expect(html).not.toContain('alt="PPC Foundations"');
    expect(html).not.toContain("cardImagePlaceholderLetter");
  });
});
