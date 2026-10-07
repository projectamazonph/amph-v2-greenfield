import { describe, expect, it } from "vitest";
import capstone from "../../../../content/curriculum/capstone.json";
import diagnostic from "../../../../content/curriculum/diagnostic.json";
import glossary from "../../../../content/curriculum/glossary.json";
import quizQuestions from "../../../../content/curriculum/quiz-questions.json";
import { NodeContentReader } from "@/infra/content/NodeContentReader";

/**
 * The Academy teaches Philippine sellers and virtual assistants, so every amount a
 * learner can read is stated in pesos (STORY-149 converted the lesson bodies,
 * STORY-150 the quiz bank and the leftovers that scan missed). A dollar amount that
 * slips back in is not a style problem: it silently breaks the arithmetic a lesson
 * or question asks the learner to do.
 *
 * A dollar sign in front of a digit is the shape that breaks arithmetic. Writing the
 * currency out in words ("USD", "dollar") stays allowed for the rare case where a
 * learner is reading a US-reported figure rather than spending against it.
 */
const DOLLAR_AMOUNT = /\$\s?[\d.,]*\d/g;

function offending(
  source: string,
  text: string,
): { source: string; amount: string; context: string }[] {
  return [...text.matchAll(DOLLAR_AMOUNT)].map((match) => ({
    source,
    amount: match[0],
    context: text
      .slice(Math.max(0, (match.index ?? 0) - 40), (match.index ?? 0) + 40)
      .replace(/\s+/g, " ")
      .trim(),
  }));
}

describe("curriculum currency contract", () => {
  it("states every lesson amount in pesos", async () => {
    const readResult = await new NodeContentReader().readAll();
    expect(readResult.ok).toBe(true);
    if (!readResult.ok) return;

    const offenders: ReturnType<typeof offending> = [];
    for (const group of readResult.value) {
      for (const file of group.files) {
        offenders.push(
          ...offending(`${file.dirSlug}/${file.fileSlug}.mdx`, `${file.frontmatter.title}\n${file.body}`),
        );
      }
    }

    expect(offenders).toEqual([]);
  });

  it("states every quiz, diagnostic, glossary and capstone amount in pesos", () => {
    const offenders = [
      ...offending("content/curriculum/quiz-questions.json", JSON.stringify(quizQuestions)),
      ...offending("content/curriculum/diagnostic.json", JSON.stringify(diagnostic)),
      ...offending("content/curriculum/glossary.json", JSON.stringify(glossary)),
      ...offending("content/curriculum/capstone.json", JSON.stringify(capstone)),
    ];

    expect(offenders).toEqual([]);
  });
});
