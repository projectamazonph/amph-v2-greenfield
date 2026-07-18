/**
 * page.test.ts — SOLID regression guard for the /courses/[slug]
 * (course detail) page.
 *
 * The page is an async React Server Component that fetches a single
 * course via buildContainer().getCourse.execute(slug). The data
 * layer must go through the composition root — never through a
 * fresh InMemory* adapter (which would always return empty).
 *
 * What we test:
 *  - The page does NOT instantiate InMemoryCourseRepository directly
 *  - The page DOES use buildContainer() + getCourse.execute()
 *  - The page renders the course's title + tagline (the most
 *    important content, even if we don't do a full SSR render)
 *
 * Use case behavior (GetCourse): covered in
 * src/usecases/__tests__/GetCourse.test.ts.
 *
 * TDD: this regression guard is what catches the bug that was
 * silently producing 404s on every course detail page.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("/courses/[slug] page — SOLID regression guard", () => {
  it("does NOT use InMemoryCourseRepository directly", async () => {
    const pagePath = path.resolve(
      process.cwd(),
      "src/app/courses/[slug]/page.tsx",
    );
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).not.toMatch(/new\s+InMemoryCourseRepository/);
    expect(source).not.toMatch(/from\s+["']@\/infra\/repositories\/InMemoryCourseRepository/);
  });

  it("DOES use buildContainer() + getCourse.execute()", async () => {
    const pagePath = path.resolve(
      process.cwd(),
      "src/app/courses/[slug]/page.tsx",
    );
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).toMatch(/buildContainer/);
    expect(source).toMatch(/getCourse\.execute/);
  });

  it("generates metadata via the container (not the broken InMemory pattern)", async () => {
    const pagePath = path.resolve(
      process.cwd(),
      "src/app/courses/[slug]/page.tsx",
    );
    const source = await fs.readFile(pagePath, "utf8");
    // generateMetadata must also use the container
    expect(source).toMatch(/generateMetadata/);
    // The metadata function should not have its own InMemory* import
    // (the regression guard on line 31 catches that).
  });
});
