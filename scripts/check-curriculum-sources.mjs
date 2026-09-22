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

/** Collect the source URL(s) each lesson's fact card cites. */
async function collectCitations() {
  const files = await lessonFiles(MODULES_DIR);
  const byUrl = new Map();
  const noFactCard = [];
  const noUrl = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const rel = relative(process.cwd(), file).replace(/\\/g, "/");
    const line = source.match(/^Official source URL:[ \t]*(.+?)[ \t]*$/m);
    if (!line) {
      if (!/^##\s+Fact card\b/im.test(source)) noFactCard.push(rel);
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
  return { byUrl, noFactCard, noUrl, lessonCount: files.length };
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

const { byUrl, noFactCard, noUrl, lessonCount } = await collectCitations();
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
console.log(`Distinct cited URLs: ${urls.length} (reachable ${alive.length}, not reachable ${dead.length})`);
for (const r of results.sort((a, b) => Number(a.ok) - Number(b.ok))) {
  const flag = r.ok ? "ok  " : "FAIL";
  console.log(`${flag} ${String(r.status ?? "-").padEnd(4)} ${r.url}  [${r.attempts.join(", ")}]`);
  for (const lesson of byUrl.get(r.url)) console.log(`       cited by ${lesson}`);
}

if (noUrl.length > 0) {
  console.log(`\nFact cards whose source line holds no URL (${noUrl.length}):`);
  for (const entry of noUrl) console.log(`- ${entry.file}: ${entry.text}`);
}
if (noFactCard.length > 0) {
  console.log(`\nLessons with no fact card (${noFactCard.length}/${lessonCount}):`);
  for (const file of noFactCard) console.log(`- ${file}`);
}

if (failOnError && dead.length > 0) process.exit(1);
