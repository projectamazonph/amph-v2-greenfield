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

    expect(html).toContain("ppc-foundations.png");
    expect(html).toContain('alt=""');
    expect(html).toContain('role="presentation"');
    expect(html).not.toContain('alt="PPC Foundations"');
    expect(html).not.toContain("cardImagePlaceholderLetter");
  });

  // M-10: the local PNG in public/courses/ is now routed through the
  // Next.js image optimizer (/_next/image?url=...) and a 1x/2x srcSet,
  // not the raw static path. This is the contract that replaces the
  // previous `eslint-disable @next/next/no-img-element` workaround.
  it("routes the local PNG through the next/image optimizer with a 1x/2x srcSet (M-10)", () => {
    const html = renderToString(
      <CourseCover title="PPC Foundations" slug="ppc-foundations" coverImage={null} />,
    );

    // The original PNG path appears URL-encoded inside the optimizer
    // endpoint URL — both in the `src` and the two `srcSet` entries.
    expect(html).toContain("/_next/image?url=");
    expect(html).toContain("w=640");
    expect(html).toContain("w=1920");
    expect(html).toContain("srcSet=");
    expect(html).toContain("data-nimg=");
    // The raw static path must NOT appear as a top-level src any more —
    // every reference should go through the optimizer.
    expect(html).not.toMatch(/src="\/courses\/ppc-foundations\.png"/);
  });

  // M-10: external URLs (CDN-sourced covers) bypass the optimizer via
  // the per-instance `unoptimized` flag. This keeps the previous "render
  // whatever URL is in the database" behaviour without requiring a
  // remotePatterns config that whitelists every CDN host. The optimizer
  // path and srcSet are absent.
  it("keeps an external CDN cover unoptimized so the raw URL passes through (M-10)", () => {
    const html = renderToString(
      <CourseCover
        title="PPC Foundations"
        slug="ppc-foundations"
        coverImage="https://cdn.example/cover.jpg"
      />,
    );

    expect(html).toContain('src="https://cdn.example/cover.jpg"');
    expect(html).not.toContain("/_next/image?url=");
    expect(html).not.toContain("srcSet=");
    expect(html).toContain('alt=""');
    expect(html).toContain('role="presentation"');
  });
});
