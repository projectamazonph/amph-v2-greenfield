import { describe, expect, it } from "vitest";
import { NodeContentReader } from "@/infra/content/NodeContentReader";

/**
 * WorksheetBlocks.test.ts - STORY-163 regression test.
 *
 * Mirrors the SelfCheckBlocks pattern: read the curriculum tree,
 * find every :::worksheet{...} directive, and assert the structural
 * contract. Catches: missing directives, IDs outside the kebab-case
 * allow-list, part numbers that don't match the lesson they're in,
 * duplicate IDs across lessons, or a lesson with more than one block.
 *
 * Five total directives expected, one per Module 1 lesson.
 */

const WORKSHEET_FENCE = /^:::worksheet\{([^}]*)\}/gm;

interface ParsedWorksheet {
  lesson: string;
  moduleNumber: number;
  lessonNumber: number;
  id: string | null;
  title: string | null;
  part: string | null;
}

function parseAttrs(body: string): Record<string, string> {
  // Same simple name="..." parsing as SelfCheckBlocks; braces not used here.
  const out: Record<string, string> = {};
  const re = /([a-zA-Z][\w-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out[m[1] ?? ""] = m[2] ?? "";
  }
  return out;
}

async function readWorksheets(): Promise<ParsedWorksheet[]> {
  const read = await new NodeContentReader().readAll();
  if (!read.ok) throw new Error(`content read failed: ${read.error.message}`);
  const found: ParsedWorksheet[] = [];
  for (const group of read.value) {
    for (const file of group.files) {
      const lesson = `${file.frontmatter.moduleNumber}.${file.frontmatter.lessonNumber}`;
      const moduleNumber = file.frontmatter.moduleNumber;
      const lessonNumber = file.frontmatter.lessonNumber;
      WORKSHEET_FENCE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = WORKSHEET_FENCE.exec(file.body)) !== null) {
        const attrs = parseAttrs(m[1] ?? "");
        found.push({
          lesson,
          moduleNumber,
          lessonNumber,
          id: attrs["id"] ?? null,
          title: attrs["title"] ?? null,
          part: attrs["part"] ?? null,
        });
      }
    }
  }
  return found;
}

describe("in-lesson :::worksheet directives", () => {
  it("finds exactly five directives (one per Module 1 lesson)", async () => {
    const blocks = await readWorksheets();
    expect(blocks).toHaveLength(5);
  });

  it("locates every block in Module 1, no leakage into other modules", async () => {
    const blocks = await readWorksheets();
    const wrongModule = blocks.filter((b) => b.moduleNumber !== 1);
    expect(wrongModule).toEqual([]);
  });

  it("assigns a unique, lowercase-kebab-case id to every block", async () => {
    const blocks = await readWorksheets();
    const ids = blocks.map((b) => b.id).filter((s): s is string => s !== null);
    expect(ids).toHaveLength(5);
    const seen = new Set<string>();
    for (const id of ids) {
      expect(id, `id "${id}" must start with a lowercase letter`).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(seen.has(id), `duplicate id "${id}"`).toBe(false);
      seen.add(id);
    }
  });

  it("gives every block a non-empty title", async () => {
    const blocks = await readWorksheets();
    const missing = blocks.filter((b) => !b.title || b.title.trim() === "");
    expect(missing.map((b) => `${b.lesson}: empty title`)).toEqual([]);
  });

  it("uses part numbers 1..5 that match the lesson number", async () => {
    const blocks = await readWorksheets();
    const bad = blocks.filter((b) => {
      const part = Number(b.part);
      return Number.isNaN(part) || part !== b.lessonNumber;
    });
    expect(bad.map((b) => `${b.lesson}: part="${b.part}"`)).toEqual([]);
  });

  it("places exactly one directive per lesson", async () => {
    const blocks = await readWorksheets();
    const perLesson = new Map<string, number>();
    for (const b of blocks) {
      perLesson.set(b.lesson, (perLesson.get(b.lesson) ?? 0) + 1);
    }
    const duplicates = Array.from(perLesson.entries()).filter(([, count]) => count > 1);
    expect(duplicates).toEqual([]);
  });
});
