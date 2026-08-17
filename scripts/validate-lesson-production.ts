/**
 * Report the small, repeatable production shape for curriculum lessons.
 * The default mode is an inventory report; --strict is the future authoring gate.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

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

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const reportArg = args.find((arg) => arg.startsWith("--report="));
const reportPath = reportArg?.slice("--report=".length);
const files = await lessonFiles(join(process.cwd(), "content", "curriculum", "modules"));
const lessons: Array<{ file: string; missing: Block[] }> = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const missing = (Object.entries(REQUIRED) as Array<[Block, RegExp]>)
    .filter(([, pattern]) => !pattern.test(source))
    .map(([block]) => block);
  lessons.push({ file: relative(process.cwd(), file), missing });
}

const missingLessons = lessons.filter((lesson) => lesson.missing.length > 0);
const report = {
  generatedAt: new Date().toISOString(),
  strict,
  lessonCount: lessons.length,
  completeLessonCount: lessons.length - missingLessons.length,
  missingLessons,
};

if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Lesson production contract: ${report.completeLessonCount}/${report.lessonCount} lessons complete`);
for (const lesson of missingLessons) console.log(`- ${lesson.file}: missing ${lesson.missing.join(", ")}`);
if (strict && missingLessons.length > 0) process.exit(1);
