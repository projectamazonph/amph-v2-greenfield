import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getVoiceGuideData } from "@/lib/voice-guide";

/**
 * `docs/voice-guide.md` says its banned phrases "never ship. Anywhere. UI copy,
 * lessons, error messages, marketing pages", and credits ESLint. For code that
 * holds: three `Literal` selectors live at `eslint.config.mjs:133-147`, and the
 * page tests assert the rendered copy as well.
 *
 * For lessons and the quiz bank it cannot hold. `eslint.config.mjs:15-21` puts
 * the markdown, MDX and JSON globs in a global `ignores`, which flat config
 * applies before any `files` matcher, so the voice rule is structurally unable
 * to see a lesson. The markdown entry in the voice block's own `files` list is
 * already unreachable for the same reason. A markdown parser is not an option,
 * because the build spec forbids new dependencies, so the only thing that can
 * cover the largest copy surface in the course is a test that reads the files.
 *
 * The list is parsed from `src/lib/voice-guide.ts` which reads the guide, so
 * the doc is the single source of truth and cannot drift from what CI enforces.
 *
 * Scope is the two surfaces `scripts/seed-all-content.mjs` publishes: lesson
 * bodies and the quiz bank.
 */

function bannedPhrases(): string[] {
  return getVoiceGuideData().bannedPhrases.map((b) => b.phrase);
}

function phraseRegex(phrase: string): RegExp {
  const body = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const lead = /^\w/.test(phrase) ? "\\b" : "";
  const tail = /\w$/.test(phrase) ? "\\b" : "";
  return new RegExp(lead + body + tail, "i");
}

function publishedFiles(): string[] {
  const dir = join(process.cwd(), "content", "curriculum", "modules");
  const lessons: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry.endsWith(".mdx")) lessons.push(p);
    }
  };
  walk(dir);
  return [...lessons, join(process.cwd(), "content", "curriculum", "quiz-questions.json")];
}

function violations(): string[] {
  const phrases = bannedPhrases();
  const hits: string[] = [];
  for (const file of publishedFiles()) {
    const rel = relative(process.cwd(), file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const phrase of phrases) {
        if (phraseRegex(phrase).test(line)) {
          hits.push(`${rel}:${i + 1} uses "${phrase}": ${line.trim().slice(0, 90)}`);
        }
      }
    });
  }
  return hits;
}

describe("published content voice rules", () => {
  it("parses the guide's whole banned list, so the gate cannot empty itself", () => {
    const phrases = bannedPhrases();
    // Measured at 94 on the day this test was written. The floor is generous so
    // normal editing of the guide does not trip it, but a heading rename or a
    // switch to a different bullet shape fails loudly here.
    expect(phrases.length).toBeGreaterThanOrEqual(80);
    // The two words ESLint itself bans cannot appear as literals in this file,
    // because `no-restricted-syntax` matches any `Literal`, including a test's
    // own assertion. Asserting on other entries from the same list proves the
    // parse works, single-word and multi-word, without tripping that rule.
    expect(phrases).toContain("seamless");
    expect(phrases).toContain("robust");
    expect(phrases).toContain("in order to");
  });

  it("scans every lesson plus the quiz bank", () => {
    // 57 lesson files (modules -1 through 11) + 1 quiz bank. A drop here means
    // the walk broke, which would otherwise show up as a clean run over a
    // smaller corpus.
    expect(publishedFiles()).toHaveLength(58);
  });

  it("ships none of the phrases the voice guide bans", () => {
    expect(violations()).toEqual([]);
  });
});
