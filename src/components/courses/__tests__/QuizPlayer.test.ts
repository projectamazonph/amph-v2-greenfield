/**
 * QuizPlayer.test.ts — voice regression guard for QuizPlayer kicker.
 *
 * The kicker ("Knowledge check") read as AI-slop per the voice guide
 * (STORY-101 follow-up). Replaced with "Quick check". This guard
 * ensures the slop does not return silently.
 *
 * Why a static-source guard: QuizPlayer is a client component using
 * useState + fetch, so a render-based test needs jsdom +
 * @testing-library/react which the project does not currently ship
 * for this layer. The grep-style guard matches the pattern already
 * used in src/app/courses/__tests__/courses-page.test.ts (SOLID
 * regression guard).
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("QuizPlayer — voice regression guard", () => {
  it("does NOT use 'Knowledge check' as the kicker", async () => {
    const componentPath = path.resolve(process.cwd(), "src/components/courses/QuizPlayer.tsx");
    const source = await fs.readFile(componentPath, "utf8");
    // The kicker is a JSX text node, so the string appears literally
    // in the source. Catch either case.
    expect(source).not.toMatch(/Knowledge check/);
    expect(source).not.toMatch(/knowledge check/);
  });

  it("DOES use 'Quick check' as the kicker", async () => {
    const componentPath = path.resolve(process.cwd(), "src/components/courses/QuizPlayer.tsx");
    const source = await fs.readFile(componentPath, "utf8");
    expect(source).toMatch(/Quick check/);
  });

  it("returns learners to the current course after submission", async () => {
    const componentPath = path.resolve(process.cwd(), "src/components/courses/QuizPlayer.tsx");
    const source = await fs.readFile(componentPath, "utf8");
    expect(source).toContain("courseHref");
    expect(source).toContain("Back to course");
    expect(source).toContain("aria-pressed={selected}");
  });

  it("does not render raw thrown errors to the student", async () => {
    const componentPath = path.resolve(process.cwd(), "src/components/courses/QuizPlayer.tsx");
    const source = await fs.readFile(componentPath, "utf8");
    expect(source).not.toMatch(/e instanceof Error/);
    expect(source).not.toMatch(/String\(e\)/);
    expect(source).toContain("studentErrorCopy.quizSubmit");
  });
});
