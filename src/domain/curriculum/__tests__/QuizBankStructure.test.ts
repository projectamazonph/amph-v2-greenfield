import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NodeContentReader } from "@/infra/content/NodeContentReader";

/**
 * `content/curriculum/quiz-questions.json` is the only source for module quiz
 * questions, and `scripts/seed-all-content.mjs` publishes it. Before this test,
 * nothing anywhere read the bank's shape: no schema, no validation script, and
 * no other test. The only thing that looked at it counted questions to compare
 * against markdown, so a malformed question was silently published and the
 * learner met it as a question they could not answer correctly at all.
 *
 * Each rule below maps to a specific failure mode in the seeder's own code, so
 * these are not invented standards. `scripts/seed-all-content.mjs:360-373`
 * builds exactly four options from `optionA` to `optionD` and marks
 * `isCorrect` by comparing each letter to `correctAnswer`, so a `correctAnswer`
 * outside A-D produces a question with no correct option. The same block reads
 * `optionD` whether or not the JSON has one, so a blank option publishes as a
 * visible empty answer. Lines 341-344 delete and recreate a quiz's questions on
 * every run, and line 348 derives the primary key from `md5("question", quizId,
 * String(q.order))`, so a duplicated `order` aborts the whole seeder mid-publish
 * and a renumbered question re-keys the ones after it, detaching past attempts
 * from what they were graded against. Lines 306-318 skip any quiz whose module
 * number maps to no course, with only a console line to show for it, which is
 * how Module -1 nearly ended up with a quiz nobody could take.
 */

type QuizQuestion = {
  order: number;
  question: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
};

type Quiz = {
  moduleNumber: number;
  title?: string;
  questions?: QuizQuestion[];
};

const LETTERS = ["A", "B", "C", "D"] as const;
/** The ranges `seed-all-content.mjs:307-314` maps onto the three courses. */
const SEEDABLE_MODULES = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function loadBank(): Quiz[] {
  const path = join(process.cwd(), "content", "curriculum", "quiz-questions.json");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { quizzes?: Quiz[] };
  if (!Array.isArray(parsed.quizzes)) {
    throw new Error("quiz bank must have a quizzes array");
  }
  return parsed.quizzes;
}

/** Reads optionA..optionD without the indexed access widening to `number`. */
function optionOf(question: QuizQuestion, letter: (typeof LETTERS)[number]): string {
  switch (letter) {
    case "A":
      return question.optionA?.trim() ?? "";
    case "B":
      return question.optionB?.trim() ?? "";
    case "C":
      return question.optionC?.trim() ?? "";
    case "D":
      return question.optionD?.trim() ?? "";
  }
}

async function modulesWithLessons(): Promise<Set<number>> {
  const read = await new NodeContentReader().readAll();
  if (!read.ok) throw new Error(`content read failed: ${read.error.message}`);
  const found = new Set<number>();
  for (const group of read.value) {
    for (const file of group.files) {
      found.add(file.frontmatter.moduleNumber);
    }
  }
  return found;
}

describe("quiz bank structure", () => {
  const bank = loadBank();

  it("gives every question a correct answer the seeder can mark", () => {
    const bad: string[] = [];
    for (const quiz of bank) {
      for (const question of quiz.questions ?? []) {
        const where = `module ${quiz.moduleNumber} q${question.order}`;
        if (!(LETTERS as readonly string[]).includes(question.correctAnswer ?? "")) {
          bad.push(`${where}: correctAnswer ${JSON.stringify(question.correctAnswer)} is not A-D`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("prints four non-blank options for every question", () => {
    const bad: string[] = [];
    for (const quiz of bank) {
      for (const question of quiz.questions ?? []) {
        const where = `module ${quiz.moduleNumber} q${question.order}`;
        for (const letter of LETTERS) {
          if (optionOf(question, letter) === "") {
            bad.push(`${where}: option${letter} is missing or blank`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("numbers questions 1..N with no gaps and no repeats", () => {
    const bad: string[] = [];
    for (const quiz of bank) {
      const orders = (quiz.questions ?? []).map((q) => q.order);
      const seen = new Set<number>();
      for (const order of orders) {
        if (seen.has(order)) {
          bad.push(`module ${quiz.moduleNumber}: order ${order} appears twice`);
        }
        seen.add(order);
      }
      const expected = orders.map((_, i) => i + 1);
      if (JSON.stringify([...orders].sort((a, b) => a - b)) !== JSON.stringify(expected)) {
        bad.push(
          `module ${quiz.moduleNumber}: orders ${JSON.stringify([...orders].sort((a, b) => a - b))} ` +
            `are not 1..${orders.length}`,
        );
      }
    }
    expect(bad).toEqual([]);
  });

  it("covers every lesson-bearing module exactly once, and only those", () => {
    const counts = new Map<number, number>();
    for (const quiz of bank) {
      counts.set(quiz.moduleNumber, (counts.get(quiz.moduleNumber) ?? 0) + 1);
    }
    const unseedable = [...counts.keys()].filter(
      (m) => !SEEDABLE_MODULES.includes(m) || Number.isNaN(m),
    );
    expect(
      unseedable,
      `modules the seeder cannot map to a course: ${unseedable.join(", ")}`,
    ).toEqual([]);
    const duplicated = [...counts.entries()].filter(([, n]) => n > 1);
    expect(duplicated, "each module must have exactly one quiz").toEqual([]);
  });

  it("matches the modules that actually have lessons", async () => {
    const lessonModules = await modulesWithLessons();
    const quizModules = new Set(bank.map((q) => q.moduleNumber));
    const quizless = [...lessonModules].filter((m) => !quizModules.has(m));
    const orphaned = [...quizModules].filter((m) => !lessonModules.has(m));
    expect(quizless, `modules with lessons but no quiz: ${quizless.join(", ")}`).toEqual([]);
    expect(orphaned, `quizzes for modules with no lessons: ${orphaned.join(", ")}`).toEqual([]);
    expect(quizModules.size).toBe(13);
  });

  it("never repeats a question stem or offers the same option twice", () => {
    const bad: string[] = [];
    for (const quiz of bank) {
      const stems = new Map<string, number>();
      for (const question of quiz.questions ?? []) {
        const stem = question.question.trim().toLowerCase();
        stems.set(stem, (stems.get(stem) ?? 0) + 1);
        const normalised = LETTERS.map((letter) => optionOf(question, letter).toLowerCase());
        const unique = new Set(normalised);
        if (unique.size !== normalised.length) {
          bad.push(
            `module ${quiz.moduleNumber} q${question.order}: two options are verbatim identical`,
          );
        }
      }
      for (const [stem, n] of stems) {
        if (n > 1)
          bad.push(`module ${quiz.moduleNumber}: stem repeats ${n}x: "${stem.slice(0, 60)}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("explains every answer, because that is where the teaching happens", () => {
    const bad: string[] = [];
    for (const quiz of bank) {
      for (const question of quiz.questions ?? []) {
        if (!question.explanation || question.explanation.trim() === "") {
          bad.push(`module ${quiz.moduleNumber} q${question.order}: no explanation`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
