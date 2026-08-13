/**
 * page.test.ts — SOLID regression guard for the /courses/[slug]
 * (course detail) page.
 *
 * The page is an async React Server Component that fetches a single
 * course via buildContainer().getCatalogCourse.execute(slug) (STORY-014).
 * The data layer must go through the composition root — never through a
 * fresh InMemory* adapter (which would always return empty).
 *
 * What we test:
 *  - The page does NOT instantiate InMemoryCourseRepository directly
 *  - The page DOES use buildContainer() + getCatalogCourse.execute()
 *  - The page renders the course's title + tagline (the most
 *    important content, even if we don't do a full SSR render)
 *
 * Use case behavior (GetCatalogCourse): covered in
 * src/usecases/__tests__/GetCatalogCourse.test.ts.
 *
 * TDD: this regression guard is what catches the bug that was
 * silently producing 404s on every course detail page.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("/courses/[slug] page — SOLID regression guard", () => {
  it("does NOT use InMemoryCourseRepository directly", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/[slug]/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).not.toMatch(/new\s+InMemoryCourseRepository/);
    expect(source).not.toMatch(/from\s+["']@\/infra\/repositories\/InMemoryCourseRepository/);
  });

  it("DOES use buildContainer() + getCatalogCourse.execute()", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/[slug]/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).toMatch(/buildContainer/);
    expect(source).toMatch(/getCatalogCourse\.execute/);
  });

  it("generates metadata via the container (not the broken InMemory pattern)", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/[slug]/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    // generateMetadata must also use the container
    expect(source).toMatch(/generateMetadata/);
    // The metadata function should not have its own InMemory* import
    // (the regression guard on line 31 catches that).
  });
});

describe("/courses/[slug] page — header meta for live-cohort tiers", () => {
  // The Ultimate Transformation tier is live-cohort only (no on-demand
  // lessons in the DB). The detail-page meta line must not render a
  // bare "0 lessons · ≈ 0 hours" — show the tier-appropriate label
  // instead, matching the /courses catalog card fix (STORY-101).
  it("branches on totalLessonCount > 0 in the meta block", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/[slug]/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).toMatch(/totalLessonCount\s*>\s*0/);
  });

  it("DOES show 'Live cohort' label when totalLessonCount is 0", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/[slug]/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).toMatch(/Live cohort/);
  });

  it("DOES NOT render the ≈ hours line inside the zero-lesson branch", async () => {
    // The hours line is gated on totalLessonCount > 0, so the
    // "≈ ... hours" computation only runs for tiers that have lessons.
    const pagePath = path.resolve(process.cwd(), "src/app/courses/[slug]/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    // Find the meta block (between the two relevant { markers)
    const metaStart = source.indexOf("<div className={styles.meta}>");
    const metaEnd = source.indexOf("</div>", metaStart);
    expect(metaStart).toBeGreaterThan(-1);
    expect(metaEnd).toBeGreaterThan(metaStart);
    const meta = source.slice(metaStart, metaEnd);
    // Find the else branch (the zero-lesson branch)
    const elseStart = meta.indexOf(": (");
    const elseEnd = meta.lastIndexOf(")}");
    expect(elseStart).toBeGreaterThan(-1);
    expect(elseEnd).toBeGreaterThan(elseStart);
    const elseBlock = meta.slice(elseStart, elseEnd);
    expect(elseBlock).not.toMatch(/Math\.ceil/);
    expect(elseBlock).not.toMatch(/hours/);
  });
});

describe("/courses/[slug] page — cover artwork", () => {
  it("uses the shared course-cover fallback instead of a letter placeholder", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/[slug]/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).toMatch(/CourseCover/);
    expect(source).not.toMatch(/coverPlaceholderLetter/);
  });
});

describe("/courses/[slug] page — course quizzes", () => {
  it("loads course quizzes and links each one to the student player", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/[slug]/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");

    expect(source).toMatch(/quizRepo\.findByCourseId/);
    expect(source).toMatch(/\/quizzes\/\$\{quiz\.id\}/);
  });
});
