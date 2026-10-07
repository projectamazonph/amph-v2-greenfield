import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = "/home/ubuntu/amazon-ph-simulators-hub/coach-decks/modules";
const jargon = [
  "acos", "roas", "tacos", "cpc", "ctr", "conversion", "auction", "placement",
  "relevance", "targeting", "segmentation", "intent", "harvest", "pacing", "variance",
  "retail readiness", "conversion constraint", "binding constraint", "contribution margin",
  "profitability", "diagnose", "signal", "evidence", "guardrail", "cadence", "taxonomy",
  "attribution", "incremental", "validated", "ambiguous", "funnel", "hypothesis"
];

const plainText = html => html
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ")
  .trim();

const entries = [];
for (const module of (await readdir(root)).filter(name => /^m\d+$/.test(name)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))) {
  const folder = path.join(root, module);
  for (const file of (await readdir(folder)).filter(name => /^slide_\d+\.html$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))) {
    const text = plainText(await readFile(path.join(folder, file), "utf8"));
    const words = (text.match(/\b[\w'-]+\b/g) ?? []).length;
    const sentences = Math.max(1, (text.match(/[.!?]+/g) ?? []).length);
    const hits = jargon.filter(term => text.toLowerCase().includes(term));
    const flags = [];
    if (words > 115) flags.push("dense copy");
    if (words / sentences > 24) flags.push("long sentences");
    if (hits.length > 3) flags.push("unexplained jargon cluster");
    if (!/(your next step|what to check|ask:|instructor move|required receipt|exit prompt|debrief|stop condition|operator standard)/i.test(text)) flags.push("no explicit learner action");
    entries.push({ module, file, words, avg: Math.round(words / sentences), hits, flags });
  }
}

const flagged = entries.filter(entry => entry.flags.length);
const rows = flagged.map(entry => `| ${entry.module.toUpperCase()} | ${entry.file.replace(".html", "")} | ${entry.words} | ${entry.avg} | ${entry.hits.join(", ") || "—"} | ${entry.flags.join("; ")} |`).join("\n");
const report = `# Beginner Copy Audit\n\nThis audit examines the 144 public module slides for copy density, sentence length, jargon clusters, and explicit learner direction. It is a revision guide rather than a curriculum-quality score.\n\n| Measure | Result |\n|---|---:|\n| Slides reviewed | ${entries.length} |\n| Slides flagged for rewrite | ${flagged.length} |\n| Density threshold | More than 115 words |\n| Sentence threshold | More than 24 words on average |\n| Jargon threshold | More than 3 essential terms on one slide |\n\n## Flagged slides\n\n| Module | Slide | Words | Avg. words per sentence | Essential terms present | Rewrite reason |\n|---|---:|---:|---:|---|---|\n${rows}\n\n## Rewrite rule\n\nFor every flagged slide, keep the core learning outcome, replace specialist phrasing with a first-use definition, use one short familiar situation, and end with one clear learner action.\n`;
await writeFile("/home/ubuntu/amazon-ph-simulators-hub/beginner_copy_audit.md", report);
console.log(`Reviewed ${entries.length} slides; flagged ${flagged.length}.`);
