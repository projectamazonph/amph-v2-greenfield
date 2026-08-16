import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCurriculumInventory,
  parseCurriculumInventoryManifest,
  summarizeCurriculumInventory,
} from "@/domain/curriculum/CurriculumInventory";
import { NodeContentReader } from "@/infra/content/NodeContentReader";

const inventoryPath = resolve(process.cwd(), "content", "curriculum", "inventory.json");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8")) as unknown;
}

const manifestResult = parseCurriculumInventoryManifest(readJson(inventoryPath));
if (!manifestResult.ok) {
  console.error("Curriculum inventory manifest is invalid:");
  for (const error of manifestResult.error) console.error(`- ${error.message}`);
  process.exit(1);
}

const sourceResult = await new NodeContentReader().readAll();
if (!sourceResult.ok) {
  console.error(`Curriculum source could not be read: ${sourceResult.error.message}`);
  process.exit(1);
}

const inventoryResult = buildCurriculumInventory(
  sourceResult.value.map((group) => ({
    courseSlug: group.courseSlug,
    lessons: group.files.map((file) => ({
      title: file.frontmatter.title,
      slug: file.frontmatter.slug,
      moduleNumber: file.frontmatter.moduleNumber,
      lessonNumber: file.frontmatter.lessonNumber,
      type: file.frontmatter.type,
      estimatedMinutes: file.frontmatter.estimatedMinutes,
      xpReward: file.frontmatter.xpReward,
      sourcePath: `${file.dirSlug}/${file.fileSlug}.mdx`,
    })),
  })),
  manifestResult.value,
);

if (!inventoryResult.ok) {
  console.error("Curriculum inventory does not match source content:");
  for (const error of inventoryResult.error) console.error(`- ${error.message}`);
  process.exit(1);
}

const summary = summarizeCurriculumInventory(inventoryResult.value);
process.stdout.write(
  `Curriculum inventory valid: ${summary.lessonCount} lessons, ${summary.totalPlannedMinutes} planned minutes.\n`,
);
