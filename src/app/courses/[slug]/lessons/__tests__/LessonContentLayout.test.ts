import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LESSON_CSS = resolve(process.cwd(), "src/app/courses/[slug]/lessons/LessonContent.module.css");

describe("lesson content layout contract", () => {
  const source = readFileSync(LESSON_CSS, "utf8");

  it("keeps markdown tables aligned and contained on narrow screens", () => {
    expect(source).toMatch(/\.prose table\s*\{[\s\S]*?display:\s*block;/);
    expect(source).toMatch(/\.prose table\s*\{[\s\S]*?overflow-x:\s*auto;/);
    expect(source).toMatch(/\.prose th,[\s\S]*?\.prose td\s*\{[\s\S]*?vertical-align:\s*top;/);
    expect(source).toMatch(/\.prose th,[\s\S]*?\.prose td\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
  });

  it("prevents long quiz prompts from pushing past the question number", () => {
    expect(source).toMatch(/\.quizQuestionPrompt\s*\{[\s\S]*?min-width:\s*0;/);
    expect(source).toMatch(/\.quizQuestionPrompt\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
  });

  it("keeps the first and last lesson blocks from inheriting stray margins", () => {
    expect(source).toContain(".prose > :first-child");
    expect(source).toContain(".prose > :last-child");
  });
});
