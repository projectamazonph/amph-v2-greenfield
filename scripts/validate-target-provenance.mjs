import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "/home/ubuntu/amph-v2-greenfield";
const registerPath = join(root, "content/migration/target-provenance.json");
const manifestPath = join(root, "content/migration/teaching-deck-slide-map.json");
const allowedClassifications = new Set(["target-specific-extension", "synthesized-from-adjacent-source-roles"]);
const allowedStatuses = new Set(["planned", "reviewed", "ported"]);

const register = JSON.parse(await readFile(registerPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

if (register.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (!Array.isArray(register.records)) errors.push("records must be an array");
if (register.recordCount !== register.records?.length) errors.push(`recordCount ${register.recordCount} does not match records length ${register.records?.length}`);

const seen = new Set();
for (const record of register.records ?? []) {
  if (!record.targetLessonSlug || seen.has(record.targetLessonSlug)) errors.push(`duplicate or missing targetLessonSlug: ${record.targetLessonSlug ?? "<missing>"}`);
  seen.add(record.targetLessonSlug);
  if (!allowedClassifications.has(record.classification)) errors.push(`invalid classification for ${record.targetLessonSlug}`);
  if (record.directSourceSlideAssignment !== false) errors.push(`target-specific record must set directSourceSlideAssignment=false: ${record.targetLessonSlug}`);
  if (!Array.isArray(record.relatedSourceRoles) || record.relatedSourceRoles.length === 0) errors.push(`missing relatedSourceRoles: ${record.targetLessonSlug}`);
  if (!Array.isArray(record.nativeLearningAids) || record.nativeLearningAids.length === 0) errors.push(`missing nativeLearningAids: ${record.targetLessonSlug}`);
  if (!Array.isArray(record.evidenceOutputs) || record.evidenceOutputs.length === 0) errors.push(`missing evidenceOutputs: ${record.targetLessonSlug}`);
  if (!allowedStatuses.has(record.status)) errors.push(`invalid status for ${record.targetLessonSlug}`);
  for (const relation of record.relatedSourceRoles ?? []) {
    if (!Number.isInteger(relation.sourceModule) || relation.sourceModule < 0 || relation.sourceModule > 11) errors.push(`invalid related source module for ${record.targetLessonSlug}`);
    if (!Array.isArray(relation.sourceSlides) || relation.sourceSlides.some((slide) => !Number.isInteger(slide) || slide < 1 || slide > 12)) errors.push(`invalid related source slides for ${record.targetLessonSlug}`);
  }
}

const directManifestTargets = new Set(manifest.rows.filter((row) => row.targetLessonSlug).map((row) => row.targetLessonSlug));
const targetLessons = new Set();
for (const moduleNumber of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
  const moduleDirs = await import("node:fs/promises").then(({ readdir }) => readdir(join(root, "content/curriculum/modules")));
  for (const moduleDir of moduleDirs.filter((dir) => dir.startsWith(`${moduleNumber}-`))) {
    const files = await import("node:fs/promises").then(({ readdir }) => readdir(join(root, "content/curriculum/modules", moduleDir)));
    for (const file of files.filter((name) => name.endsWith(".mdx"))) targetLessons.add(file.replace(/\.mdx$/, ""));
  }
}
for (const record of register.records ?? []) {
  if (!targetLessons.has(record.targetLessonSlug)) errors.push(`registered target lesson does not exist: ${record.targetLessonSlug}`);
  if (directManifestTargets.has(record.targetLessonSlug)) errors.push(`target-specific lesson unexpectedly has a direct manifest assignment: ${record.targetLessonSlug}`);
}

if (errors.length > 0) {
  console.error(`Target-provenance register invalid: ${errors.length} error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const byClass = Object.groupBy(register.records, (record) => record.classification);
console.log(`Target-provenance register valid: ${register.records.length} intentional target lessons`);
console.log(`Classifications: ${JSON.stringify(Object.fromEntries(Object.entries(byClass).map(([key, value]) => [key, value.length])))}`);
console.log(`All registered lessons exist and remain intentionally outside the direct 144-row source-slide assignment set.`);
