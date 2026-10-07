import { describe, expect, it } from "vitest";
import { NodeContentReader } from "@/infra/content/NodeContentReader";

/**
 * Lessons point at each other by number in prose a learner follows mid lesson:
 * "the full negative-keyword lesson lives in 2.3", "Lesson 1.3 covers how to
 * calculate that margin". Nothing checked those pointers, so a rename or a
 * renumber leaves a sentence sending a learner somewhere that does not exist,
 * and the only way to notice was to read all 45 lessons by hand.
 *
 * The pattern is deliberately narrow: the word Lesson or Lessons, then an `X.Y`
 * number, then optionally a second number after to/and/or/- for a range. Bare
 * numbers are excluded on purpose. `12.5%` and `0.11` sit in lesson prose all
 * over, so matching them would have this test complain about arithmetic instead
 * of about a broken link. A first draft of this file also asserted that a
 * lesson must not point more than one module ahead. It found exactly one
 * violation, `-1.3:84` "Lesson 2.1 covers match types in detail", which is a
 * reasonable thing to tell a learner, so that rule was wrong and is gone.
 */

const REFERENCE =
  /Lessons?\s+(-?\d+\.\d+)(?:\s+(?:to|and|-|or)\s+(-?\d+\.\d+))?/gi;

async function readLessons() {
  const read = await new NodeContentReader().readAll();
  if (!read.ok) throw new Error(`content read failed: ${read.error.message}`);
  return read.value.flatMap((group) => group.files);
}

describe("lesson cross-references", () => {
  it("every Lesson X.Y pointer names a lesson that exists", async () => {
    const files = await readLessons();
    const known = new Set(
      files.map(
        (file) => `${file.frontmatter.moduleNumber}.${file.frontmatter.lessonNumber}`,
      ),
    );

    const broken: { from: string; to: string; line: string }[] = [];
    let checked = 0;

    for (const file of files) {
      const from = `${file.dirSlug}/${file.fileSlug}`;
      for (const match of file.body.matchAll(REFERENCE)) {
        const whole = match[0] ?? "";
        const targets = [match[1], match[2]].filter((n): n is string => Boolean(n));
        for (const target of targets) {
          checked += 1;
          if (!known.has(target)) {
            broken.push({ from, to: target, line: whole });
          }
        }
      }
    }

    // Fails if the pattern ever stops matching, which would otherwise turn this
    // into a green test that proves nothing.
    expect(checked).toBeGreaterThanOrEqual(30);
    expect(broken).toEqual([]);
  });
});
