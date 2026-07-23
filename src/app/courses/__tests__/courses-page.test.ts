/**
 * courses-page.test.ts — SOLID regression guard for the /courses page.
 *
 * The /courses page is an async React Server Component that fetches
 * course data via buildContainer().listCatalogCourses.execute() (STORY-014).
 * We can't use react-dom/server.renderToString directly because async server
 * components need React's special SSR pipeline (not a sync string
 * render). The meaningful test surface for the page is:
 *
 * 1. **Use case behavior** (ListCatalogCourses): covered in
 *    src/usecases/__tests__/ListCatalogCourses.test.ts
 * 2. **Container wiring**: covered in
 *    src/composition/container.test.ts
 * 3. **SOLID regression guard**: this file
 *
 * The regression guard ensures the page NEVER instantiates
 * InMemory* adapters directly. If a future refactor reverts to the
 * broken pattern (which silently produced empty catalogs), this
 * test catches it.
 *
 * TDD: this is the minimum test that locks in the bug fix from
 * Tier A. More comprehensive testing of the page is the
 * responsibility of integration tests (Playwright, future story).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("/courses page — SOLID regression guard", () => {
  it("does NOT use InMemoryCourseRepository directly", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).not.toMatch(/new\s+InMemoryCourseRepository/);
    expect(source).not.toMatch(/from\s+["']@\/infra\/repositories\/InMemoryCourseRepository/);
  });

  it("DOES use buildContainer() to access the data layer", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/courses/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    // The page must consult the composition root
    expect(source).toMatch(/buildContainer/);
    // And the use case is dispatched through the container
    expect(source).toMatch(/listCatalogCourses\.execute/);
  });
});
