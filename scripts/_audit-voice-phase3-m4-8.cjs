/**
 * Phase 3 second-half inventory for modules 4-8.
 *
 * Counts three classes of voice-guide violations so we know the diff budget:
 *   1. USD amounts (`$NN` or `$N.NN`) that should be PHP.
 *   2. Em-dashes (` — `) and double-hyphen usage (` -- `). Em-dashes are
 *      banned by the voice guide; double-hyphens are a code smell that
 *      usually means an em-dash was meant.
 *   3. `> **Analogy:**` / `> **Tip:**` / `> **Note:**` / `> **Warning:**`
 *      blockquote headers. PR #397 dropped these in modules 2-3.
 *   4. Body-prose sentences over 30 words, mirroring the
 *      `scripts/_audit-sentence-length.cjs` rules.
 *
 * Usage: node scripts/_audit-voice-phase3-m4-8.cjs
 * Exits 0 with a report. Exits 1 if any class has hits (so we can
 * gate on a clean run before pushing).
 */
const fs = require("fs");
const path = require("path");

const ROOT = "content/curriculum/modules";
const MODULES = [
  "4-campaign-architecture",
  "5-portfolio-strategy",
  "6-bidding-lab",
  "7-search-term-triage",
  "8-competitive-intelligence",
];

function listMdx(mod) {
  const dir = path.join(ROOT, mod);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.join(dir, f));
}

function isInCodeBlock(lines, idx) {
  // Tracks fence state through the file up to (but not including) idx.
  let inCode = false;
  for (let i = 0; i < idx; i++) {
    if (/^```/.test(lines[i])) inCode = !inCode;
  }
  return inCode;
}

function audit(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const findings = { usd: 0, emDash: 0, blockquoteHeader: 0, longSentence: 0 };
  const sample = { usd: [], emDash: [], blockquoteHeader: [], longSentence: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const inCode = isInCodeBlock(lines, i);

    // USD
    if (!inCode && /\$\d/.test(trimmed)) {
      findings.usd++;
      if (sample.usd.length < 3) sample.usd.push(`${i + 1}: ${trimmed.slice(0, 100)}`);
    }
    // Em-dash (real em-dash, not hyphen)
    if (!inCode && / — /.test(trimmed)) {
      findings.emDash++;
      if (sample.emDash.length < 3) sample.emDash.push(`${i + 1}: ${trimmed.slice(0, 100)}`);
    }
    // Blockquote headers
    if (/^>\s+\*\*(Analogy|Tip|Note|Warning|Heads-up|Heads up|Important)\b/i.test(trimmed)) {
      findings.blockquoteHeader++;
      if (sample.blockquoteHeader.length < 3) sample.blockquoteHeader.push(`${i + 1}: ${trimmed.slice(0, 100)}`);
    }
    // Long sentence in body prose (mirrors _audit-sentence-length.cjs rules)
    if (inCode) continue;
    if (
      trimmed.startsWith("---") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith(">") ||
      /^\d+\./.test(trimmed) ||
      trimmed.startsWith("- [")
    )
      continue;
    const sentences = trimmed.split(/(?<=[.!?])(?=["'\s]|$)\s*["']?\s+/);
    for (const s of sentences) {
      const wc = s.split(/\s+/).filter((w) => w.length > 0).length;
      if (wc > 30) {
        findings.longSentence++;
        if (sample.longSentence.length < 3) sample.longSentence.push(`${i + 1} (${wc}w): ${s.slice(0, 80)}...`);
        break; // one hit per line is enough
      }
    }
  }

  return { file, findings, sample };
}

const all = MODULES.flatMap(listMdx).map(audit);
const totals = all.reduce(
  (acc, r) => ({
    usd: acc.usd + r.findings.usd,
    emDash: acc.emDash + r.findings.emDash,
    blockquoteHeader: acc.blockquoteHeader + r.findings.blockquoteHeader,
    longSentence: acc.longSentence + r.findings.longSentence,
  }),
  { usd: 0, emDash: 0, blockquoteHeader: 0, longSentence: 0 },
);

console.log("=== Per file ===");
for (const r of all) {
  const f = r.findings;
  if (f.usd + f.emDash + f.blockquoteHeader + f.longSentence === 0) {
    console.log(`  ${r.file}: clean`);
    continue;
  }
  console.log(`  ${r.file}: usd=${f.usd} emDash=${f.emDash} bqHeader=${f.blockquoteHeader} longSent=${f.longSentence}`);
  for (const k of Object.keys(r.sample)) {
    if (r.sample[k].length > 0) {
      console.log(`    ${k}: ${r.sample[k].join(" | ")}`);
    }
  }
}
console.log("=== Totals ===");
console.log(`  USD: ${totals.usd}`);
console.log(`  em-dash: ${totals.emDash}`);
console.log(`  blockquoteHeader: ${totals.blockquoteHeader}`);
console.log(`  longSentence: ${totals.longSentence}`);

const totalHits = totals.usd + totals.emDash + totals.blockquoteHeader + totals.longSentence;
process.exit(totalHits === 0 ? 0 : 1);
