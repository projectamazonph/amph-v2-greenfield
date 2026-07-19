/**
 * Regression guard: the lesson page must use the AuthorizeLessonAccess
 * use case for access decisions — it MUST NOT re-implement the
 * anonymous-vs-authenticated branching inline.
 *
 * P0-5 audit bullet: "Make a single AuthorizeLessonAccess use case
 * decide full, preview, or denied access for every user state. Test
 * boundary indexes for anonymous, authenticated-preview, enrolled,
 * refunded, and admin users."
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("P0-5: lesson page uses AuthorizeLessonAccess", () => {
  it("the lesson page imports container.authorizeLessonAccess", async () => {
    const p = path.resolve(
      process.cwd(),
      "src/app/courses/[slug]/lessons/[lessonId]/page.tsx",
    );
    const source = await fs.readFile(p, "utf8");
    expect(source).toMatch(/container\.authorizeLessonAccess\.execute/);
  });

  it("the lesson page no longer calls container.checkCourseAccess (the old broken path)", async () => {
    const p = path.resolve(
      process.cwd(),
      "src/app/courses/[slug]/lessons/[lessonId]/page.tsx",
    );
    const source = await fs.readFile(p, "utf8");
    // The previous implementation branched on userId presence and called
    // either checkCourseAccess (for authed users) or computed the
    // preview count inline (for anonymous). The new path is a single
    // call to authorizeLessonAccess.
    expect(source).not.toMatch(/container\.checkCourseAccess\.execute/);
    expect(source).not.toMatch(/allLessonIds\.indexOf/);
  });

  it("the AuthorizeLessonAccess use case exists at the expected path", async () => {
    const p = path.resolve(
      process.cwd(),
      "src/usecases/AuthorizeLessonAccess.ts",
    );
    const exists = await fs.stat(p).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it("AuthorizeLessonAccess is wired into AppContainer (production)", async () => {
    const p = path.resolve(
      process.cwd(),
      "src/composition/container.ts",
    );
    const source = await fs.readFile(p, "utf8");
    expect(source).toMatch(/authorizeLessonAccess:\s*AuthorizeLessonAccess/);
    expect(source).toMatch(/new AuthorizeLessonAccess\(/);
  });

  it("AuthorizeLessonAccess is wired into TestContainer", async () => {
    const p = path.resolve(
      process.cwd(),
      "src/composition/container.test.ts",
    );
    const source = await fs.readFile(p, "utf8");
    expect(source).toMatch(/new AuthorizeLessonAccess\(/);
  });
});
