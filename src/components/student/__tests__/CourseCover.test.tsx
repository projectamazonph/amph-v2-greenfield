import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { CourseCover, getCourseCoverImage } from "../CourseCover";

describe("CourseCover", () => {
  it("uses authored course artwork when a course has no uploaded cover", () => {
    expect(getCourseCoverImage("ppc-foundations", null)).toBe(
      "/courses/ppc-foundations.png",
    );
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

  it("renders meaningful alt text for the image fallback", () => {
    const html = renderToString(
      <CourseCover title="PPC Foundations" slug="ppc-foundations" coverImage={null} />,
    );

    expect(html).toContain('src="/courses/ppc-foundations.png"');
    expect(html).toContain('alt="PPC Foundations"');
    expect(html).not.toContain("cardImagePlaceholderLetter");
  });
});
