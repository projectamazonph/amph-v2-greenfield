/**
 * Report the small, repeatable production shape for curriculum lessons.
 * The default mode is an inventory report; --strict is the future authoring gate.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseDirectiveAttrs } from "../src/lib/mdx/directive-plugin";

type Block = "outcome" | "decision" | "workedExample" | "activeAttempt" | "feedback" | "evidence" | "retrieval";

const REQUIRED: Record<Block, RegExp> = {
  outcome: /^##\s+What you can do after this lesson\s*$/im,
  decision: /^##\s+The decision in one sentence\s*$/im,
  workedExample: /example|case study|scenario|walkthrough|calculate|calculation|work it through/i,
  activeAttempt: /^##\s+(Your turn|Try this|Try This|What Would YOU Do|Practice)\b/im,
  feedback: /^##\s+(Check|Quick check|Answers?|Feedback)\s*$/im,
  evidence: /worksheet|client language|artifact|deliverable|record|evidence/i,
  retrieval: /^##\s+(Key takeaway|Key takeaways|What to read next|Quick check|Check)\s*$/im,
};

async function lessonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await lessonFiles(path)));
    else if (entry.name.endsWith(".mdx")) files.push(path);
  }
  return files.sort();
}

interface BlockIssue {
  file: string;
  line: number;
  message: string;
}

const FENCE_OPEN = /^:::([a-z-]+)(?:\{([^}]*)\})?\s*$/;
const FENCE_CLOSE = /^:::\s*$/;
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const ALLOWED_DIRECTIVES = new Set(["trade-off", "process", "callout"]);
const ALLOWED_CALLOUT_VARIANTS = new Set(["info", "warning", "pitfall"]);
const EM_DASH = "\u2014";

// Extract JSX attributes from a SelfCheck body. Handles name="..." (double-quoted),
// name='...' (single-quoted), and name={...} (brace-delimited expression, up to
// 2 levels of nested braces). The brace value is returned WITHOUT the outer braces.
const JSX_ATTR_RE = /([a-zA-Z][\w-]*)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\{(?:[^{}]|\{[^{}]*\})*\})/g;

function extractJsxAttrs(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Reset regex state for each call.
  JSX_ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JSX_ATTR_RE.exec(body)) !== null) {
    let v = m[2];
    if (v.startsWith('"') || v.startsWith("'")) v = v.slice(1, -1);
    else if (v.startsWith("{")) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

function findFenceBody(lines: string[], startIdx: number): { closeIdx: number; body: string[] } {
  const body: string[] = [];
  for (let j = startIdx; j < lines.length; j++) {
    if (FENCE_CLOSE.test(lines[j])) return { closeIdx: j, body };
    body.push(lines[j]);
  }
  return { closeIdx: -1, body };
}

function countStringLiterals(arrayBody: string): number {
  // Count "..." or '...' literals in a JS array body. Used for `options={...}`.
  const re = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
  return (arrayBody.match(re) ?? []).length;
}

function validateActivePracticeBlocks(source: string, file: string): BlockIssue[] {
  const issues: BlockIssue[] = [];
  const lines = source.split(/\r?\n/);
  const seenIds = new Set<string>();

  // Pass 1: directive fences (:::trade-off{...}, :::process{...}, :::callout{...})
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openMatch = line.match(FENCE_OPEN);
    if (!openMatch) continue;

    const name = openMatch[1];
    const attrs = parseDirectiveAttrs(openMatch[2] ?? "");
    const lineNo = i + 1;

    if (!ALLOWED_DIRECTIVES.has(name)) {
      issues.push({ file, line: lineNo, message: `Unknown directive block: ${name}` });
    }

    const id = attrs.id;
    if (!id) {
      issues.push({ file, line: lineNo, message: `${name} block is missing required 'id' attribute` });
    } else if (!ID_PATTERN.test(id)) {
      issues.push({ file, line: lineNo, message: `${name} id '${id}' must be lowercase kebab-case` });
    } else if (seenIds.has(id)) {
      issues.push({ file, line: lineNo, message: `Duplicate block id '${id}' in lesson` });
    } else if (id) {
      seenIds.add(id);
    }

    if (name === "trade-off") {
      if (!attrs.title) {
        issues.push({ file, line: lineNo, message: "trade-off requires a 'title' attribute" });
      }
      const { closeIdx, body } = findFenceBody(lines, i + 1);
      const tableLines = body.filter((l) => l.trim().startsWith("|"));
      const dataRows = tableLines.filter((l) => !/^\|?\s*[-:|\s]+\s*\|?\s*$/.test(l));
      // Subtract 1 for the header row itself.
      if (dataRows.length - 1 < 2) {
        issues.push({ file, line: lineNo, message: "trade-off needs at least 2 data rows in its markdown table" });
      }
      if (closeIdx !== -1) i = closeIdx;
      continue;
    }

    if (name === "process") {
      if (!attrs.title) {
        issues.push({ file, line: lineNo, message: "process requires a 'title' attribute" });
      }
      if (!attrs.steps) {
        issues.push({ file, line: lineNo, message: "process requires a 'steps' attribute" });
      } else {
        const steps = attrs.steps.split("|").map((s) => s.trim()).filter(Boolean);
        if (steps.length < 2) {
          issues.push({ file, line: lineNo, message: "process needs at least 2 steps" });
        }
      }
      const { closeIdx } = findFenceBody(lines, i + 1);
      if (closeIdx !== -1) i = closeIdx;
      continue;
    }

    if (name === "callout") {
      const variant = attrs.variant ?? "info";
      if (!ALLOWED_CALLOUT_VARIANTS.has(variant)) {
        issues.push({ file, line: lineNo, message: `callout variant must be info|warning|pitfall, got ${variant}` });
      }
      const { closeIdx, body } = findFenceBody(lines, i + 1);
      const nonEmptyBody = body.some((l) => l.trim().length > 0);
      if (!nonEmptyBody) {
        issues.push({ file, line: lineNo, message: "callout body must be non-empty" });
      }
      if (closeIdx !== -1) i = closeIdx;
      continue;
    }
  }

  // Voice check: no em dashes inside fenced block content. Em dashes elsewhere
  // in the lesson are caught by ESLint; we only enforce the rule inside blocks.
  let insideFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE_OPEN.test(lines[i])) {
      insideFence = true;
      continue;
    }
    if (FENCE_CLOSE.test(lines[i])) {
      insideFence = false;
      continue;
    }
    if (insideFence && lines[i].includes(EM_DASH)) {
      issues.push({ file, line: i + 1, message: "Block content uses em-dash; voice guide forbids it" });
    }
  }

  // Pass 2: <SelfCheck ... /> JSX blocks. Parse via a simple regex — we don't
  // need a real JSX parser to validate shape.
  const SELF_CHECK_RE = /<SelfCheck\b([^>]*?)\/>/gs;
  let m: RegExpExecArray | null;
  while ((m = SELF_CHECK_RE.exec(source)) !== null) {
    const attrs = extractJsxAttrs(m[1]);
    const offset = source.slice(0, m.index).split(/\r?\n/).length;

    const id = attrs.id;
    if (!id) {
      issues.push({ file, line: offset, message: "SelfCheck is missing required 'id' attribute" });
    } else if (!ID_PATTERN.test(id)) {
      issues.push({ file, line: offset, message: `SelfCheck id '${id}' must be lowercase kebab-case` });
    } else if (seenIds.has(id)) {
      issues.push({ file, line: offset, message: `Duplicate block id '${id}' in lesson` });
    } else {
      seenIds.add(id);
    }

    if (!attrs.prompt) {
      issues.push({ file, line: offset, message: "SelfCheck is missing required 'prompt' attribute" });
    }

    if (!attrs.options) {
      issues.push({ file, line: offset, message: "SelfCheck is missing required 'options' attribute" });
    } else {
      const optsMatch = attrs.options.match(/^\s*\[\s*([\s\S]*?)\s*\]\s*$/);
      if (!optsMatch) {
        issues.push({ file, line: offset, message: "SelfCheck options must be a string[] literal" });
      } else {
        const optCount = countStringLiterals(optsMatch[1]);
        if (optCount < 2 || optCount > 5) {
          issues.push({ file, line: offset, message: `SelfCheck options.length must be in [2,5], got ${optCount}` });
        }
        const answerIdx = Number(attrs.answerIndex);
        if (!Number.isFinite(answerIdx) || answerIdx < 0 || answerIdx >= optCount) {
          issues.push({
            file,
            line: offset,
            message: `SelfCheck answerIndex must be in [0, options.length), got ${attrs.answerIndex}`,
          });
        }
      }
    }

    if (!attrs.explanation) {
      issues.push({ file, line: offset, message: "SelfCheck is missing required 'explanation' attribute" });
    } else if (attrs.explanation.length < 12) {
      issues.push({
        file,
        line: offset,
        message: `SelfCheck explanation must be >= 12 chars, got ${attrs.explanation.length}`,
      });
    }
  }

  return issues;
}

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const reportArg = args.find((arg) => arg.startsWith("--report="));
const reportPath = reportArg?.slice("--report=".length);
const files = await lessonFiles(join(process.cwd(), "content", "curriculum", "modules"));
const lessons: Array<{ file: string; missing: Block[]; blockIssues: BlockIssue[] }> = [];
let blockIssueCount = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  const missing = (Object.entries(REQUIRED) as Array<[Block, RegExp]>)
    .filter(([, pattern]) => !pattern.test(source))
    .map(([block]) => block);
  const blockIssues = validateActivePracticeBlocks(source, relative(process.cwd(), file));
  blockIssueCount += blockIssues.length;
  lessons.push({ file: relative(process.cwd(), file), missing, blockIssues });
}

const missingLessons = lessons.filter((lesson) => lesson.missing.length > 0);
const report = {
  generatedAt: new Date().toISOString(),
  strict,
  lessonCount: lessons.length,
  completeLessonCount: lessons.length - missingLessons.length,
  missingLessons,
  activePracticeBlockIssueCount: blockIssueCount,
};

if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Lesson production contract: ${report.completeLessonCount}/${report.lessonCount} lessons complete`);
for (const lesson of missingLessons) console.log(`- ${lesson.file}: missing ${lesson.missing.join(", ")}`);
for (const lesson of lessons) {
  for (const issue of lesson.blockIssues) console.error(`[${issue.file}:${issue.line}] ${issue.message}`);
}
if (report.activePracticeBlockIssueCount > 0) {
  console.log(`Active-practice block issues: ${report.activePracticeBlockIssueCount}`);
}
if (strict && (missingLessons.length > 0 || blockIssueCount > 0)) process.exit(1);
