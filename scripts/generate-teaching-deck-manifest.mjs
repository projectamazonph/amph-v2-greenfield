import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const SOURCE_ROOT = "/home/ubuntu/amazon-ph-simulators";
const TARGET_ROOT = "/home/ubuntu/amph-v2-greenfield";
const SOURCE_DECK_ROOT = join(SOURCE_ROOT, "coach-decks", "modules");
const TARGET_LESSON_ROOT = join(TARGET_ROOT, "content", "curriculum", "modules");
const OUTPUT_DIR = join(TARGET_ROOT, "content", "migration");
const OUTPUT_PATH = join(OUTPUT_DIR, "teaching-deck-slide-map.json");

const TARGET_MODULES = {
  0: { slug: "0-onboarding", course: "ppc-foundations", lessons: ["0.1-welcome", "0.2-platform-tour", "0.3-first-simulation"] },
  1: { slug: "1-foundations", course: "ppc-foundations", lessons: ["1.1-read-ppc-data-before-you-change-it", "1.2-cpc-ctr", "1.3-acos-tacos-profitability", "1.4-roas-measuring-return", "1.5-metrics-in-practice"] },
  2: { slug: "2-keyword-research", course: "ppc-foundations", lessons: ["2.1-match-types", "2.2-keyword-research-workflow", "2.3-negative-keywords", "2.4-keyword-grouping"] },
  3: { slug: "3-listing-optimization", course: "ppc-foundations", lessons: ["3.1-listing-quality-score", "3.2-listing-anatomy", "3.3-aplus-content"] },
  4: { slug: "4-campaign-architecture", course: "ppc-foundations", lessons: ["4.1-sponsored-products", "4.2-sponsored-brands-display", "4.3-campaign-structure", "4.4-campaign-architecture-practice"] },
  5: { slug: "5-portfolio-strategy", course: "accelerated-mastery", lessons: ["5.1-campaign-portfolios", "5.2-budget-pacing", "5.3-seasonal-strategy"] },
  6: { slug: "6-bidding-lab", course: "accelerated-mastery", lessons: ["6.1-bid-strategies", "6.2-placement-adjustments", "6.3-bid-elevator-prep"] },
  7: { slug: "7-search-term-triage", course: "accelerated-mastery", lessons: ["7.1-search-term-analysis", "7.2-negative-keywords", "7.3-str-triage-prep"] },
  8: { slug: "8-competitive-intelligence", course: "accelerated-mastery", lessons: ["8.1-brand-analytics", "8.2-share-of-voice", "8.3-competitor-benchmarking"] },
  9: { slug: "9-weekly-optimization", course: "accelerated-mastery", lessons: ["9.1-weekly-routine", "9.2-one-change-at-a-time", "9.3-how-much-data-is-enough"] },
  10: { slug: "10-reporting-troubleshooting", course: "accelerated-mastery", lessons: ["10.1-simple-report-structure", "10.2-explaining-numbers", "10.3-no-impressions-low-ctr", "10.4-clicks-no-sales-high-acos"] },
  11: { slug: "11-va-workflow-capstone", course: "ultimate-transformation", lessons: ["11.1-tasks-by-cadence", "11.2-permissions-ladder", "11.3-sops-change-log", "11.4-client-communication-capstone"] },
};

const TARGETS = {
  0: ["0.1-welcome", "0.1-welcome", "0.1-welcome", "0.2-platform-tour", "0.2-platform-tour", "0.2-platform-tour", "0.2-platform-tour", "0.2-platform-tour", "0.3-first-simulation", "0.3-first-simulation", "0.3-first-simulation", "0.3-first-simulation"],
  1: ["1.1-read-ppc-data-before-you-change-it", "1.1-read-ppc-data-before-you-change-it", "1.1-read-ppc-data-before-you-change-it", "1.1-read-ppc-data-before-you-change-it", "1.2-cpc-ctr", "1.2-cpc-ctr", "1.2-cpc-ctr", "1.2-cpc-ctr", "1.5-metrics-in-practice", "1.5-metrics-in-practice", "1.5-metrics-in-practice", "1.5-metrics-in-practice"],
  2: ["1.1-read-ppc-data-before-you-change-it", "1.2-cpc-ctr", "1.2-cpc-ctr", "1.3-acos-tacos-profitability", "1.3-acos-tacos-profitability", "1.4-roas-measuring-return", "1.3-acos-tacos-profitability", "1.4-roas-measuring-return", "1.5-metrics-in-practice", "1.5-metrics-in-practice", "1.5-metrics-in-practice", "1.5-metrics-in-practice"],
  3: ["4.3-campaign-structure", "4.3-campaign-structure", "4.3-campaign-structure", "4.3-campaign-structure", "4.1-sponsored-products", "4.2-sponsored-brands-display", "4.2-sponsored-brands-display", "4.3-campaign-structure", "4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice"],
  4: ["2.1-match-types", "2.1-match-types", "2.1-match-types", "2.1-match-types", "2.1-match-types", "2.1-match-types", "2.3-negative-keywords", "2.2-keyword-research-workflow", "2.4-keyword-grouping", "2.4-keyword-grouping", "2.4-keyword-grouping", "2.4-keyword-grouping"],
  5: ["3.1-listing-quality-score", "3.1-listing-quality-score", "3.2-listing-anatomy", "3.2-listing-anatomy", "3.2-listing-anatomy", "3.2-listing-anatomy", "3.2-listing-anatomy", "3.3-aplus-content", "3.3-aplus-content", "3.3-aplus-content", "3.3-aplus-content", "3.3-aplus-content"],
  6: ["4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice", "4.3-campaign-structure", "5.2-budget-pacing", "5.2-budget-pacing", "5.2-budget-pacing", "4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice", "4.4-campaign-architecture-practice"],
  7: ["6.1-bid-strategies", "6.1-bid-strategies", "5.2-budget-pacing", "5.2-budget-pacing", "6.3-bid-elevator-prep", "6.3-bid-elevator-prep", "6.3-bid-elevator-prep", "6.3-bid-elevator-prep", "6.3-bid-elevator-prep", "6.3-bid-elevator-prep", "6.3-bid-elevator-prep", "6.3-bid-elevator-prep"],
  8: ["7.1-search-term-analysis", "7.1-search-term-analysis", "7.1-search-term-analysis", "7.1-search-term-analysis", "7.1-search-term-analysis", "7.2-negative-keywords", "7.2-negative-keywords", "7.3-str-triage-prep", "7.3-str-triage-prep", "7.3-str-triage-prep", "7.3-str-triage-prep", "7.3-str-triage-prep"],
  9: ["9.1-weekly-routine", "9.1-weekly-routine", "9.1-weekly-routine", "9.2-one-change-at-a-time", "9.2-one-change-at-a-time", "9.3-how-much-data-is-enough", "9.3-how-much-data-is-enough", "9.3-how-much-data-is-enough", "9.3-how-much-data-is-enough", "9.3-how-much-data-is-enough", "9.3-how-much-data-is-enough", "9.3-how-much-data-is-enough"],
  10: ["10.1-simple-report-structure", "10.1-simple-report-structure", "10.1-simple-report-structure", "10.1-simple-report-structure", "10.3-no-impressions-low-ctr", "10.3-no-impressions-low-ctr", "10.3-no-impressions-low-ctr", "10.4-clicks-no-sales-high-acos", "10.4-clicks-no-sales-high-acos", "10.4-clicks-no-sales-high-acos", "10.4-clicks-no-sales-high-acos", "10.4-clicks-no-sales-high-acos"],
  11: ["11.1-tasks-by-cadence", "11.1-tasks-by-cadence", "11.2-permissions-ladder", "11.3-sops-change-log", "11.3-sops-change-log", "11.2-permissions-ladder", "11.4-client-communication-capstone", "11.4-client-communication-capstone", "11.4-client-communication-capstone", "11.4-client-communication-capstone", "11.4-client-communication-capstone", "11.4-client-communication-capstone"],
};

const AID_TO_TARGET = {
  "lesson-map": { targetDirective: "lesson-pathway", disposition: "merged" },
  "formula-block": { targetDirective: "formula-ladder", disposition: "merged" },
  "comparison-table": { targetDirective: "comparison-table", disposition: "merged" },
  "triage-board": { targetDirective: "classification-board", disposition: "merged" },
  "hierarchy-tree": { targetDirective: "hierarchy-builder", disposition: "merged" },
  "illustrated-decision": { targetDirective: "decision-flow", disposition: "merged" },
  "metric-card": { targetDirective: "visual", disposition: "merged" },
  "process-diagram": { targetDirective: "process", disposition: "merged" },
  "interactive-exercise": { targetDirective: "SelfCheck", disposition: "merged" },
  "evidence-table": { targetDirective: "evidence-ledger", disposition: "merged" },
  "do-dont-comparison": { targetDirective: "callout", disposition: "merged" },
  "assessment-gate": { targetDirective: "module-final-quiz", disposition: "merged" },
};

const SOURCE_ROLE = {
  1: "orientation",
  9: "practice",
  10: "safety",
  11: "evidence",
  12: "assessment",
};

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function slideFiles(moduleNumber) {
  const dir = join(SOURCE_DECK_ROOT, `m${moduleNumber}`);
  const names = await readdir(dir);
  return names
    .filter((name) => /^slide_\d+\.html$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
}

function titleFromHtml(source) {
  const h1 = source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = h1 ?? source.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "Untitled slide";
  return decodeEntities(title.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function aidFromHtml(source) {
  return source.match(/data-learning-aid="([^"]+)"/i)?.[1] ?? "unclassified";
}

function targetModuleForLesson(targetLesson) {
  const moduleNumber = Number(targetLesson.match(/^\d+/)?.[0]);
  return TARGET_MODULES[moduleNumber];
}

function evidenceOutput(role, targetLesson) {
  if (role === "practice") return `Decision note for ${targetLesson}`;
  if (role === "safety") return "Safety boundary and escalation note";
  if (role === "evidence") return "Evidence row with date, signal, action, and next review";
  if (role === "assessment") return "Module-final quiz attempt and next simulator action";
  return `Lesson artifact for ${targetLesson}`;
}

const rows = [];
for (const moduleNumber of Object.keys(TARGET_MODULES).map(Number)) {
  const files = await slideFiles(moduleNumber);
  if (files.length !== 12) throw new Error(`m${moduleNumber} has ${files.length} slides; expected 12`);
  for (const fileName of files) {
    const slideNumber = Number(fileName.match(/\d+/)[0]);
    const sourcePath = join(SOURCE_DECK_ROOT, `m${moduleNumber}`, fileName);
    const source = await readFile(sourcePath, "utf8");
    const sourceAid = aidFromHtml(source);
    const mapping = AID_TO_TARGET[sourceAid] ?? { targetDirective: "editorial-review", disposition: "reframed" };
    const targetLessonSlug = TARGETS[moduleNumber][slideNumber - 1];
    const targetModule = targetModuleForLesson(targetLessonSlug);
    const role = SOURCE_ROLE[slideNumber] ?? "concept";
    rows.push({
      sourceId: `m${moduleNumber}-slide-${slideNumber}`,
      sourceModule: moduleNumber,
      sourceSlide: slideNumber,
      sourcePath: relative(SOURCE_ROOT, sourcePath),
      sourceTitle: titleFromHtml(source),
      sourceRole: role,
      sourceAid,
      targetCourse: targetModule.course,
      targetModuleNumber: Number(targetModule.slug.match(/^\d+/)[0]),
      targetModuleSlug: targetModule.slug,
      targetLessonSlug,
      targetDirective: mapping.targetDirective,
      evidenceOutput: evidenceOutput(role, targetLessonSlug),
      disposition: mapping.disposition,
      mergeReason: `Source ${role} content is consolidated into the target lesson's native MDX learning sequence; preserve the concept, action, and evidence payload without recreating a standalone slide page.`,
      editorialStatus: "queued",
    });
  }
}

await mkdir(OUTPUT_DIR, { recursive: true });
const manifest = {
  schemaVersion: 1,
  generatedAt: "2026-08-26",
  sourceRepository: "projectamazonph/amazon-ph-simulators",
  targetRepository: "projectamazonph/amph-v2-greenfield",
  sourceSlideCount: rows.length,
  targetLessonCount: 42,
  migrationStrategy: "Preserve instructional payload; consolidate repeated slide scaffolding into native MDX lessons.",
  rows,
};
await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${rows.length} rows to ${OUTPUT_PATH}`);
