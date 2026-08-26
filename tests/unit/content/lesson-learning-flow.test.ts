import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const curriculumRoot = path.resolve(process.cwd(), "content/curriculum/modules");

async function loadLessonBodies(): Promise<Array<{ sourcePath: string; body: string }>> {
  const moduleEntries = await readdir(curriculumRoot, { withFileTypes: true });
  const lessons: Array<{ sourcePath: string; body: string }> = [];

  for (const moduleEntry of moduleEntries) {
    if (!moduleEntry.isDirectory()) continue;
    const modulePath = path.join(curriculumRoot, moduleEntry.name);
    const lessonEntries = await readdir(modulePath, { withFileTypes: true });

    for (const lessonEntry of lessonEntries) {
      if (!lessonEntry.isFile() || !lessonEntry.name.endsWith(".mdx")) continue;
      const sourcePath = path.join(modulePath, lessonEntry.name);
      lessons.push({ sourcePath, body: await readFile(sourcePath, "utf8") });
    }
  }

  return lessons;
}

function countSections(body: string): number {
  return (body.match(/^##\s+/gm) ?? []).length;
}

function hasAppliedArtifact(body: string): boolean {
  return /^(:::|<SelfCheck)/m.test(body) ||
    /\b(your turn|independent|practice|worksheet|simulation|try this|apply)\b/i.test(body);
}

describe("lesson learning-flow coverage", () => {
  it("keeps every native lesson visibly sectioned and immediately applied", async () => {
    const lessons = await loadLessonBodies();

    expect(lessons).toHaveLength(42);

    const lessonsWithTooFewSections = lessons
      .filter((lesson) => countSections(lesson.body) < 3)
      .map((lesson) => lesson.sourcePath);
    const lessonsWithoutAppliedArtifact = lessons
      .filter((lesson) => !hasAppliedArtifact(lesson.body))
      .map((lesson) => lesson.sourcePath);

    expect(lessonsWithTooFewSections).toEqual([]);
    expect(lessonsWithoutAppliedArtifact).toEqual([]);
  });
});
