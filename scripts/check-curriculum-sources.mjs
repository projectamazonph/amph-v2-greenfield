/**
 * Curriculum source-link health check.
 *
 * Every lesson fact card cites an "Official source URL" and carries a
 * "Next review due" date. The dates are a manual promise; this is the
 * mechanical half: confirm each cited source still resolves, and report which
 * lessons would be left holding a dead reference.
 *
 * Report-only by default. Amazon's public help pages sit behind bot
 * treatment and login redirects, so a hard CI gate on them would be flaky.
 * Pass --fail-on-error to turn non-2xx answers into an exit code for a
 * scheduled (non-blocking) job.
 *
 * Usage:
 *   node scripts/check-curriculum-sources.mjs
 *   node scripts/check-curriculum-sources.mjs --fail-on-error --timeout=15000
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const failOnError = args.includes("--fail-on-error");
const timeoutArg = args.find((a) => a.startsWith("--timeout="));
const TIMEOUT_MS = timeoutArg ? Number(timeoutArg.slice("--timeout=".length)) : 20_000;
const CONCURRENCY = 4;

const MODULES_DIR = join(process.cwd(), "content", "curriculum", "modules");
const URL_PATTERN = /https?:\/\/[^\s"')\]}<>]+/g;

/**
 * Phrasing that explains why a fact card has no link, as opposed to leaving the
 * field blank. Matched positively, so a stub like "TBD" or an empty value stays
 * in the needs-a-source bucket instead of being waved through.
 */
const STATED_NO_SOURCE_REASON =
  /(no external source|no single official source|not a documented|not covered by|category-specific|first-party|teaching heuristic|inference from)/i;

async function lessonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await lessonFiles(path)));
    else if (entry.name.endsWith(".mdx")) files.push(path);
  }
  return files.sort();
}

/** Classify the `Last verified` field so unreviewed cards are countable. */
function verifyStyle(value) {
  if (value === null) return "absent";
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return "dated";
  if (/pending/i.test(v)) return "pending-text";
  if (v.includes("[") && v.includes("]")) return "bracket-todo";
  return "other";
}

/** Collect the source URL(s) each lesson's fact card cites. */
async function collectCitations() {
  const files = await lessonFiles(MODULES_DIR);
  const byUrl = new Map();
  const noFactCard = [];
  const noUrl = [];
  const verification = new Map();

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const rel = relative(process.cwd(), file).replace(/\\/g, "/");
    const style = verifyStyle(source.match(/^Last verified:[ \t]*(.+?)[ \t]*$/m)?.[1] ?? null);
    verification.set(rel, style);
    const line = source.match(/^Official source URL:[ \t]*(.+?)[ \t]*$/m);
    if (!line) {
      if (!/^##\s+.*fact card\b/im.test(source)) noFactCard.push(rel);
      continue;
    }
    const urls = line[1].match(URL_PATTERN) ?? [];
    if (urls.length === 0) {
      noUrl.push({ file: rel, text: line[1].trim() });
      continue;
    }
    for (const url of urls.map((u) => u.replace(/[.,;]+$/, ""))) {
      if (!byUrl.has(url)) byUrl.set(url, []);
      byUrl.get(url).push(rel);
    }
  }
  return { byUrl, noFactCard, noUrl, verification, lessonCount: files.length };
}

/** HEAD first, GET when HEAD is refused, because help pages often reject HEAD. */
async function probe(url) {
  const headers = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
  };
  const attempts = [];
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      attempts.push(`${method} ${res.status}`);
      if (res.ok) return { url, method, status: res.status, ok: true, attempts };
      if (res.status >= 400 && res.status < 500 && method === "HEAD") continue;
      return { url, method, status: res.status, ok: false, attempts };
    } catch (err) {
      attempts.push(`${method} ${err?.name ?? "error"}`);
    }
  }
  return { url, ok: false, status: null, attempts };
}

const { byUrl, noFactCard, noUrl, verification, lessonCount } = await collectCitations();
const urls = [...byUrl.keys()].sort();
const results = [];
for (let i = 0; i < urls.length; i += CONCURRENCY) {
  const batch = urls.slice(i, i + CONCURRENCY);
  results.push(...(await Promise.all(batch.map(probe))));
}

const dead = results.filter((r) => !r.ok);
const alive = results.filter((r) => r.ok);

console.log("Curriculum source-link health");
console.log(`Lessons scanned: ${lessonCount}`);
console.log(
  `Distinct cited URLs: ${urls.length} (reachable ${alive.length}, not reachable ${dead.length})`,
);
for (const r of results.sort((a, b) => Number(a.ok) - Number(b.ok))) {
  const flag = r.ok ? "ok  " : "FAIL";
  console.log(`${flag} ${String(r.status ?? "-").padEnd(4)} ${r.url}  [${r.attempts.join(", ")}]`);
  for (const lesson of byUrl.get(r.url)) console.log(`       cited by ${lesson}`);
}

// A source line with no URL is only unfinished work if it does not say why.
// Some cards correctly decline to cite one: the lesson describes this app, the
// claim is a teaching heuristic, or the limit is category-specific and no single
// page covers it. Listing those beside blank sources puts pressure on whoever
// reads this report to invent a link to make the number go down, so split them
// and keep both counts visible.
const explained = noUrl.filter((entry) => STATED_NO_SOURCE_REASON.test(entry.text));
const unexplained = noUrl.filter((entry) => !STATED_NO_SOURCE_REASON.test(entry.text));
if (noUrl.length > 0) {
  console.log(`\nFact cards whose source line holds no URL (${noUrl.length}):`);
  console.log(`  states why there is no link, nothing to do (${explained.length}):`);
  for (const entry of explained) console.log(`  - ${entry.file}: ${entry.text}`);
  console.log(`  no reason given, needs a source or a reason (${unexplained.length}):`);
  for (const entry of unexplained) console.log(`  - ${entry.file}: ${entry.text}`);
}
if (noFactCard.length > 0) {
  console.log(`\nLessons with no fact card (${noFactCard.length}/${lessonCount}):`);
  for (const file of noFactCard) console.log(`- ${file}`);
}

// A reachable link is not a reviewed claim. Count how many cards still carry an
// unfilled verification date, since that is the half only the content owner can do.
const styles = new Map();
for (const style of verification.values()) styles.set(style, (styles.get(style) ?? 0) + 1);
const unverified = [...verification.entries()].filter(
  ([, style]) => style === "pending-text" || style === "bracket-todo",
);
console.log(
  `\nLast verified field: ${styles.get("dated") ?? 0} dated, ` +
    `${styles.get("pending-text") ?? 0} pending text, ` +
    `${styles.get("bracket-todo") ?? 0} bracket todo, ` +
    `${styles.get("absent") ?? 0} no field`,
);
if (unverified.length > 0) {
  console.log(
    `Fact cards still awaiting a content-owner verification date (${unverified.length}):`,
  );
  for (const [file] of unverified.sort()) console.log(`- ${file}`);
}

if (failOnError && dead.length > 0) process.exit(1);
