import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface VoiceGuideEntry {
  readonly id: string;
  readonly category: "Banned Phrase" | "Voice Rule" | "Student Load Rule" | "Sentence-Level Rule";
  readonly originalOrTitle: string;
  readonly replacementOrDescription: string;
  readonly subcategory?: string;
}

export interface VoiceGuideData {
  readonly entries: readonly VoiceGuideEntry[];
  readonly bannedPhrases: readonly {
    readonly phrase: string;
    readonly replacement: string;
    readonly subcategory: string;
  }[];
}

const ARROW = "\u2192";

function parseBannedPhrases(content: string) {
  const start = content.indexOf("## Banned Phrases");
  if (start === -1) throw new Error("docs/voice-guide.md lost its 'Banned Phrases' heading");
  const next = content.indexOf("\n## ", start + 5);
  const section = content.slice(start, next === -1 ? content.length : next);

  const phrases: { phrase: string; replacement: string; subcategory: string }[] = [];
  let subcategory = "The Obvious Ones";

  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      subcategory = trimmed.slice(4).trim();
    } else {
      const m = /^-\s+"([^"]+)"\s*/.exec(trimmed);
      const phraseText = m?.[1]?.trim();
      if (phraseText && trimmed.includes(ARROW)) {
        const parts = trimmed.split(ARROW);
        const replacement = parts.length > 1 ? (parts[1]?.trim() ?? "") : "";
        phrases.push({
          phrase: phraseText,
          replacement,
          subcategory,
        });
      }
    }
  }

  return phrases;
}

function parseRulesSection(
  content: string,
  sectionHeading: string,
  category: VoiceGuideEntry["category"]
): VoiceGuideEntry[] {
  const start = content.indexOf(`## ${sectionHeading}`);
  if (start === -1) return [];
  const next = content.indexOf("\n## ", start + 5);
  const section = content.slice(start, next === -1 ? content.length : next);

  const entries: VoiceGuideEntry[] = [];
  let index = 1;

  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    const m = /^\d+\.\s+\*\*([^*]+)\*\*\s*(.*)$/.exec(trimmed);
    const title = m?.[1]?.trim();
    const desc = m?.[2]?.trim();
    if (title && desc !== undefined) {
      entries.push({
        id: `${category.toLowerCase().replace(/\s+/g, "-")}-${index++}`,
        category,
        originalOrTitle: title,
        replacementOrDescription: desc,
      });
    }
  }

  return entries;
}

let cachedData: VoiceGuideData | null = null;

export function getVoiceGuideData(): VoiceGuideData {
  if (cachedData) return cachedData;

  const guidePath = join(process.cwd(), "docs", "voice-guide.md");
  const content = readFileSync(guidePath, "utf8");

  const banned = parseBannedPhrases(content);
  const voiceRules = parseRulesSection(content, "Voice in Three Sentences", "Voice Rule");
  const studentRules = parseRulesSection(content, "Student Load Rules", "Student Load Rule");
  const sentenceRules = parseRulesSection(content, "Sentence-Level Rules", "Sentence-Level Rule");

  const bannedEntries: VoiceGuideEntry[] = banned.map((b, i) => ({
    id: `banned-${i + 1}`,
    category: "Banned Phrase",
    originalOrTitle: b.phrase,
    replacementOrDescription: b.replacement,
    subcategory: b.subcategory,
  }));

  const entries: VoiceGuideEntry[] = [
    ...voiceRules,
    ...studentRules,
    ...sentenceRules,
    ...bannedEntries,
  ];

  cachedData = {
    entries,
    bannedPhrases: banned,
  };

  return cachedData;
}
