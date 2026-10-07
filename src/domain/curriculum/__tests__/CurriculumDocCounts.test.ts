import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import quizBank from "../../../../content/curriculum/quiz-questions.json";
import { NodeContentReader } from "@/infra/content/NodeContentReader";

/**
 * `content/CURRICULUM-INDEX.md` and `CURRICULUM-SYLLABUS.md` are the human-facing maps of
 * the curriculum; the MDX frontmatter is what the platform actually imports. They drifted
 * for real: Module -1 arrived as three new lessons while both documents kept saying
 * "42 lessons", "443 minutes" and "12 modules", and lesson 0.1 kept its old duration after
 * being re-timed. A map that understates the course misleads the people planning around it,
 * so every number these documents state is pinned to the frontmatter it describes.
 */

type LessonFact = {
  readonly id: string;
  readonly moduleNumber: number;
  readonly minutes: number;
  readonly xp: number;
};

const INDEX_DOC = "content/CURRICULUM-INDEX.md";
const SYLLABUS_DOC = "CURRICULUM-SYLLABUS.md";

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

async function lessonFacts(): Promise<readonly LessonFact[]> {
  const read = await new NodeContentReader().readAll();
  if (!read.ok) throw new Error(`content read failed: ${read.error.message}`);
  return read.value.flatMap((group) =>
    group.files.map((file) => ({
      id: `${file.frontmatter.moduleNumber}.${file.frontmatter.lessonNumber}`,
      moduleNumber: file.frontmatter.moduleNumber,
      minutes: file.frontmatter.estimatedMinutes,
      xp: file.frontmatter.xpReward,
    })),
  );
}

/**
 * A lesson table row carries exactly two bare numbers: its duration and its XP. Reading
 * them positionally would break whenever a column is added, which has already happened:
 * the syllabus uses a six-column table for Modules -1 to 8 and a five-column one from
 * Module 9 on, and the index uses five.
 */
function lessonRows(text: string): Map<string, { minutes: number; xp: number }> {
  const rows = new Map<string, { minutes: number; xp: number }>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (!/^-?\d+\.\d+$/.test(cells[0] ?? "")) continue;
    const numbers = cells
      .slice(1)
      .filter((cell) => /^\d{1,4}( min)?$/.test(cell))
      .map((cell) => Number.parseInt(cell, 10));
    const lessonId = cells[0];
    const [minutes, xp] = numbers;
    if (!lessonId || minutes === undefined || xp === undefined) continue;
    rows.set(lessonId, { minutes, xp });
  }
  return rows;
}

describe("curriculum overview documents track the lesson frontmatter", () => {
  it("has one row per lesson, with the real duration and XP", async () => {
    const lessons = await lessonFacts();
    expect(lessons.length).toBeGreaterThan(0);

    for (const doc of [INDEX_DOC, SYLLABUS_DOC]) {
      const rows = lessonRows(readFileSync(doc, "utf8"));
      const problems: string[] = [];
      for (const lesson of lessons) {
        const row = rows.get(lesson.id);
        if (!row) {
          problems.push(`no row for lesson ${lesson.id}`);
          continue;
        }
        if (row.minutes !== lesson.minutes) {
          problems.push(
            `${lesson.id} duration: document ${row.minutes}, frontmatter ${lesson.minutes}`,
          );
        }
        if (row.xp !== lesson.xp) {
          problems.push(`${lesson.id} XP: document ${row.xp}, frontmatter ${lesson.xp}`);
        }
      }
      expect(problems, `${doc} disagrees with the lesson frontmatter`).toEqual([]);
    }
  });

  it("states the real course totals", async () => {
    const lessons = await lessonFacts();
    const modules = new Set(lessons.map((lesson) => lesson.moduleNumber)).size;
    const minutes = sum(lessons.map((lesson) => lesson.minutes));
    const xp = sum(lessons.map((lesson) => lesson.xp));

    const index = readFileSync(INDEX_DOC, "utf8");
    const syllabus = readFileSync(SYLLABUS_DOC, "utf8");

    const stated: readonly { doc: string; text: string; line: string }[] = [
      {
        doc: INDEX_DOC,
        text: index,
        line: `**Total:** ${modules} modules · ${lessons.length} lessons · ${quizBank.quizzes.length} module-final quizzes`,
      },
      {
        doc: INDEX_DOC,
        text: index,
        line: `The pass threshold is ${publicPassThreshold()}%`,
      },
      {
        doc: SYLLABUS_DOC,
        text: syllabus,
        line: `**Total Planned Reading Time:** ${minutes} minutes`,
      },
      {
        doc: SYLLABUS_DOC,
        text: syllabus,
        line: `**Total XP:** ${xp.toLocaleString("en-US")} points`,
      },
      {
        doc: SYLLABUS_DOC,
        text: syllabus,
        line: `**Current:** ${lessons.length} lessons across ${modules} modules`,
      },
      { doc: SYLLABUS_DOC, text: syllabus, line: `Reading baseline:** ${minutes} planned minutes` },
    ];

    const missing = stated
      .filter((entry) => !entry.text.replace(/\s+/g, " ").includes(entry.line.replace(/\s+/g, " ")))
      .map((entry) => `${entry.doc} is missing "${entry.line}"`);
    expect(missing).toEqual([]);
  });

  it("states the real aggregate in each syllabus module heading", async () => {
    const lessons = await lessonFacts();
    const syllabus = readFileSync(SYLLABUS_DOC, "utf8");
    const problems: string[] = [];

    for (const [moduleNumber, moduleLessons] of new Map(
      lessons.map((lesson) => [
        lesson.moduleNumber,
        lessons.filter((l) => l.moduleNumber === lesson.moduleNumber),
      ]),
    )) {
      const heading = syllabus.match(
        new RegExp(
          `^### \\*\\*Module ${moduleNumber}: .*?\\*\\* \\((\\d+) lessons, ~?(\\d+) minutes, ([\\d,]+) XP\\)`,
          "m",
        ),
      );
      if (!heading) {
        problems.push(
          `Module ${moduleNumber} heading is missing or in a shape this test cannot read`,
        );
        continue;
      }
      const want = [
        moduleLessons.length,
        sum(moduleLessons.map((lesson) => lesson.minutes)),
        sum(moduleLessons.map((lesson) => lesson.xp)).toLocaleString("en-US"),
      ];
      const got = heading.slice(1, 4);
      if (want.some((value, index) => String(value) !== got[index])) {
        problems.push(
          `Module ${moduleNumber} heading says ${got.join("/")} lessons/minutes/XP, frontmatter says ${want.join("/")}`,
        );
      }
    }

    expect(problems).toEqual([]);
  });
});

function publicPassThreshold(): number {
  return quizBank._meta.passThreshold as number;
}
