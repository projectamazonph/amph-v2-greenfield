import { access, readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const TARGET_ROOT = "/home/ubuntu/amph-v2-greenfield";
const SOURCE_ROOT = process.env.AMPH_SOURCE_REPO ?? "/home/ubuntu/amazon-ph-simulators";
const MANIFEST_PATH = join(TARGET_ROOT, "content", "migration", "teaching-deck-slide-map.json");
const requireSource = process.argv.includes("--require-source");

const DIRECTIVES = new Set([
  "trade-off", "process", "callout", "visual", "slide", "comparison-table", "formula-ladder",
  "classification-board", "decision-flow", "simulation-rubric", "annotated-listing", "hierarchy-builder",
  "funnel-canvas", "timeline-calendar", "competitive-gap-matrix", "insight-router", "lesson-pathway",
  "simulation-brief", "portfolio-map", "seasonal-calendar", "evidence-ledger", "sov-positioner",
]);
const SPECIAL_TARGETS = new Set(["SelfCheck", "module-final-quiz"]);
const SOURCE_AIDS = new Set([
  "lesson-map", "formula-block", "comparison-table", "triage-board", "hierarchy-tree", "illustrated-decision",
  "metric-card", "process-diagram", "interactive-exercise", "evidence-table", "do-dont-comparison", "assessment-gate",
]);

async function accessIfPresent(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function allMdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await allMdxFiles(path)));
    else if (entry.name.endsWith(".mdx")) files.push(path);
  }
  return files.sort();
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const rows = manifest.rows;
const errors = [];
const warnings = [];

if (manifest.schemaVersion !== 1) errors.push("manifest schemaVersion must be 1");
if (manifest.sourceSlideCount !== 144) errors.push(`manifest sourceSlideCount must be 144, found ${manifest.sourceSlideCount}`);
if (!Array.isArray(rows) || rows.length !== 144) errors.push(`manifest must contain 144 rows, found ${rows?.length ?? "non-array"}`);

const sourceIds = new Set();
const targetSlugs = new Set();
const aidCounts = new Map();
const directiveCounts = new Map();
const moduleCounts = new Map();

for (const row of rows) {
  if (!row.sourceId || sourceIds.has(row.sourceId)) errors.push(`duplicate or missing sourceId: ${row.sourceId ?? "<missing>"}`);
  sourceIds.add(row.sourceId);
  if (typeof row.sourceModule !== "number" || row.sourceModule < 0 || row.sourceModule > 11) errors.push(`invalid sourceModule for ${row.sourceId}`);
  if (typeof row.sourceSlide !== "number" || row.sourceSlide < 1 || row.sourceSlide > 12) errors.push(`invalid sourceSlide for ${row.sourceId}`);
  if (!row.sourceTitle || !row.sourceRole || !row.sourcePath) errors.push(`missing source metadata for ${row.sourceId}`);
  if (!SOURCE_AIDS.has(row.sourceAid)) errors.push(`unsupported or missing sourceAid '${row.sourceAid}' for ${row.sourceId}`);
  if (!row.targetCourse || !row.targetModuleSlug || !row.targetLessonSlug) errors.push(`missing target location for ${row.sourceId}`);
  if (!DIRECTIVES.has(row.targetDirective) && !SPECIAL_TARGETS.has(row.targetDirective)) errors.push(`unsupported target directive '${row.targetDirective}' for ${row.sourceId}`);
  if (!row.disposition || !row.mergeReason || !row.evidenceOutput) errors.push(`missing migration metadata for ${row.sourceId}`);
  if (!row.editorialStatus) errors.push(`missing editorial status for ${row.sourceId}`);

  aidCounts.set(row.sourceAid, (aidCounts.get(row.sourceAid) ?? 0) + 1);
  directiveCounts.set(row.targetDirective, (directiveCounts.get(row.targetDirective) ?? 0) + 1);
  moduleCounts.set(row.sourceModule, (moduleCounts.get(row.sourceModule) ?? 0) + 1);
  targetSlugs.add(row.targetLessonSlug);

  if (requireSource) {
    const sourcePath = join(SOURCE_ROOT, row.sourcePath);
    if (!(await accessIfPresent(sourcePath))) errors.push(`source file not found: ${row.sourcePath}`);
  }
}

for (let moduleNumber = 0; moduleNumber < 12; moduleNumber += 1) {
  if (moduleCounts.get(moduleNumber) !== 12) errors.push(`source module ${moduleNumber} must have 12 rows, found ${moduleCounts.get(moduleNumber) ?? 0}`);
}

const mdxFiles = await allMdxFiles(join(TARGET_ROOT, "content", "curriculum", "modules"));
const targetLessonFiles = new Map();
for (const path of mdxFiles) {
  const source = await readFile(path, "utf8");
  const slug = source.match(/^slug:\s*["']([^"']+)["']/m)?.[1] ?? path.split("/").pop()?.replace(/\.mdx$/, "");
  if (slug) targetLessonFiles.set(slug, relative(TARGET_ROOT, path));
}
if (targetLessonFiles.size !== 42) errors.push(`target lesson inventory must contain 42 lessons, found ${targetLessonFiles.size}`);
for (const slug of targetSlugs) if (!targetLessonFiles.has(slug)) errors.push(`mapped target lesson does not exist: ${slug}`);
const unassignedTargetLessons = [...targetLessonFiles.keys()].filter((slug) => !targetSlugs.has(slug)).sort();
if (unassignedTargetLessons.length > 0) warnings.push(`target lessons without a direct source-slide assignment: ${unassignedTargetLessons.join(", ")}`);

const plugin = await readFile(join(TARGET_ROOT, "src", "lib", "mdx", "directive-plugin.ts"), "utf8");
const renderer = await readFile(join(TARGET_ROOT, "src", "app", "courses", "[slug]", "lessons", "LessonContent.tsx"), "utf8");
for (const directive of DIRECTIVES) {
  const genericDirective = directive === "trade-off" || directive === "process" || directive === "callout" || directive === "visual" || directive === "slide";
  if (!genericDirective && !plugin.includes(`"${directive}"`)) errors.push(`directive-plugin does not register '${directive}'`);
  if (directive !== "trade-off" && directive !== "process" && directive !== "callout" && directive !== "visual" && directive !== "slide" && !renderer.includes(`block === "${directive}"`)) {
    errors.push(`LessonContent does not render '${directive}'`);
  }
}
if (!renderer.includes("SelfCheck")) errors.push("LessonContent does not expose SelfCheck for interactive exercise mappings");
if (!renderer.includes("quizHref")) warnings.push("module-final-quiz is mapped as a route-level target and is not rendered by the MDX block renderer");

if (errors.length > 0) {
  console.error(`Teaching-deck manifest invalid: ${errors.length} error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Teaching-deck manifest valid: ${rows.length} rows, ${targetLessonFiles.size} target lessons, ${targetSlugs.size} mapped lessons`);
console.log(`Source aids: ${JSON.stringify(Object.fromEntries([...aidCounts].sort()))}`);
console.log(`Target primitives: ${JSON.stringify(Object.fromEntries([...directiveCounts].sort()))}`);
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
