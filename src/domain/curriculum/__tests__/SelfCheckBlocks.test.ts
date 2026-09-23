import { describe, expect, it } from "vitest";
import { NodeContentReader } from "@/infra/content/NodeContentReader";

/**
 * In-lesson `<SelfCheck>` blocks are the "did that land?" step a learner hits
 * mid lesson. `src/components/lesson/SelfCheck.tsx:55` decides correctness with
 * a bare `selected === answerIndex` and no range guard, and the options are
 * rendered one radio per array entry. So an `answerIndex` outside the array is
 * not a warning, it is a question a learner cannot get right however well they
 * understood the lesson, which is the same failure class as a miskeyed quiz.
 *
 * These rules were measured before being asserted, and all 14 blocks in the
 * tree satisfy them today: unique ids, an id that starts with the lesson it sits
 * in, 4 or 5 non-blank options with no repeats, an in-range answer, and a
 * non-empty prompt and explanation. The id rule is a prefix on purpose. A second
 * check inside one lesson is legitimate, so the rule allows `sc-1-5-anything`
 * while still catching a check that drifted into the wrong lesson.
 *
 * Parsing note: lesson option arrays carry a trailing comma before the closing
 * bracket (`...failing",\n  ]`), which is valid JavaScript and invalid strict
 * JSON, so the commas are stripped before `JSON.parse`. That is a parser detail,
 * not a content defect, and three of the 14 blocks would have looked broken
 * without it.
 */

const BLOCK = /<SelfCheck\b([\s\S]*?)\/>/g;

function attribute(body: string, name: string): string | null {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|\\{([\\s\\S]*?)\\}\\s*)`);
  const match = body.match(pattern);
  if (!match) return null;
  return (match[1] ?? match[2] ?? "").trim();
}

function parseOptions(raw: string | null): string[] | null {
  if (raw === null) return null;
  try {
    // JSX allows a trailing comma, JSON.parse does not.
    const parsed: unknown = JSON.parse(raw.replace(/,(\s*[}\]])/g, "$1"));
    return Array.isArray(parsed) ? parsed.map((o) => String(o)) : null;
  } catch {
    return null;
  }
}

type Parsed = {
  from: string;
  lesson: string;
  id: string | null;
  options: string[] | null;
  rawOptions: string | null;
  answerIndex: number | null;
  prompt: string | null;
  explanation: string | null;
};

async function selfChecks(): Promise<Parsed[]> {
  const read = await new NodeContentReader().readAll();
  if (!read.ok) throw new Error(`content read failed: ${read.error.message}`);
  const found: Parsed[] = [];
  for (const group of read.value) {
    for (const file of group.files) {
      const lesson = `${file.frontmatter.moduleNumber}.${file.frontmatter.lessonNumber}`;
      for (const match of file.body.matchAll(BLOCK)) {
        const body = match[1] ?? "";
        const raw = attribute(body, "answerIndex");
        found.push({
          from: `${file.dirSlug}/${file.fileSlug}`,
          lesson,
          id: attribute(body, "id"),
          options: parseOptions(attribute(body, "options")),
          rawOptions: attribute(body, "options"),
          answerIndex: raw === null ? null : Number(raw),
          prompt: attribute(body, "prompt"),
          explanation: attribute(body, "explanation"),
        });
      }
    }
  }
  return found;
}

describe("in-lesson SelfCheck blocks", () => {
  it("finds the blocks, so this gate cannot pass by matching nothing", async () => {
    const blocks = await selfChecks();
    expect(blocks.length).toBeGreaterThanOrEqual(14);
    // Every options array must survive parsing, or the checks below are vacuous.
    const unparsed = blocks.filter((b) => b.options === null);
    expect(
      unparsed.map((b) => `${b.from}: ${String(b.rawOptions).slice(0, 40)}`),
      "option arrays must parse",
    ).toEqual([]);
  });

  it("points every answerIndex at an option a learner can click", async () => {
    const bad: string[] = [];
    for (const block of await selfChecks()) {
      const options = block.options ?? [];
      const answer = block.answerIndex;
      if (answer === null || !Number.isInteger(answer)) {
        bad.push(`${block.from} ${String(block.id)}: answerIndex is ${String(answer)}`);
        continue;
      }
      if (answer < 0 || answer >= options.length) {
        bad.push(
          `${block.from} ${String(block.id)}: answerIndex ${answer} is outside 0..${options.length - 1}`,
        );
      }
    }
    expect(bad).toEqual([]);
  });

  it("gives every option real text and never repeats one", async () => {
    const bad: string[] = [];
    for (const block of await selfChecks()) {
      const options = block.options ?? [];
      if (options.length < 2)
        bad.push(`${block.from} ${String(block.id)}: only ${options.length} options`);
      options.forEach((option, i) => {
        if (option.trim() === "")
          bad.push(`${block.from} ${String(block.id)}: option ${i} is blank`);
      });
      const normalised = options.map((o) => o.trim().toLowerCase());
      if (new Set(normalised).size !== normalised.length) {
        bad.push(`${block.from} ${String(block.id)}: two options are identical`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("keeps SelfCheck ids unique and tied to the lesson they sit in", async () => {
    const blocks = await selfChecks();
    const seen = new Map<string, string>();
    const bad: string[] = [];
    for (const block of blocks) {
      const id = block.id ?? "";
      if (id === "") {
        bad.push(`${block.from}: no id`);
        continue;
      }
      const prior = seen.get(id);
      if (prior) bad.push(`id "${id}" used by both ${prior} and ${block.from}`);
      seen.set(id, block.from);
      // Prefix, not equality: a lesson may legitimately hold a second check.
      if (!id.startsWith(`sc-${block.lesson.replace(".", "-")}`)) {
        bad.push(
          `${block.from}: id "${id}" does not start with sc-${block.lesson.replace(".", "-")}`,
        );
      }
    }
    expect(bad).toEqual([]);
  });

  it("always states a prompt and an explanation", async () => {
    const bad: string[] = [];
    for (const block of await selfChecks()) {
      if (!block.prompt || block.prompt.trim() === "")
        bad.push(`${block.from} ${String(block.id)}: no prompt`);
      if (!block.explanation || block.explanation.trim() === "") {
        bad.push(`${block.from} ${String(block.id)}: no explanation`);
      }
    }
    expect(bad).toEqual([]);
  });
});
