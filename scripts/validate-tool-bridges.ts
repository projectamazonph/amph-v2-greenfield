/**
 * scripts/validate-tool-bridges.ts
 *
 * Runs the LEARN-030 lesson-to-tool bridge validator against the real
 * curriculum inventory, public-claim config, and the registered
 * simulator ids. Joins every failure into one pass; exits non-zero
 * when any structural error is found.
 *
 * The published-scenario check is intentionally omitted here because
 * the Learning release gate CI job runs without a database. The
 * `validate:tool-bridges` script remains filesystem-only so it can
 * run inside the existing release gate; the
 * `/api/health/ready` probe covers the published-scenario signal at
 * deploy time.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCurriculumInventory,
  parseCurriculumInventoryManifest,
} from "@/domain/curriculum/CurriculumInventory";
import { NodeContentReader } from "@/infra/content/NodeContentReader";
import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";
import { validateToolBridges } from "@/lib/toolBridge";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8")) as unknown;
}

const inventoryPath = resolve(process.cwd(), "content", "curriculum", "inventory.json");
const claimsPath = resolve(process.cwd(), "content", "curriculum", "public-claims.json");

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

const claims = readJson(claimsPath) as {
  tierSimulatorTargets: Record<string, readonly string[]>;
};

const registry = buildSimulatorRegistry();
const registeredSimulatorIds = registry.list().map((sim) => sim.simulatorId);

const tiers = Object.entries(claims.tierSimulatorTargets).map(([tier, simulatorTargets]) => ({
  tier,
  simulatorTargets,
}));

const lessons = inventoryResult.value.lessons
  .filter((lesson) => lesson.toolBridge.kind === "simulator")
  .map((lesson) => ({
    slug: lesson.slug,
    toolBridge: {
      kind: "simulator" as const,
      target: (lesson.toolBridge as { kind: "simulator"; target: string }).target,
    },
  }));

const errors = validateToolBridges({
  registeredSimulatorIds,
  // Filesystem-only check: skip the published-scenario signal. The
  // deploy-time probe at /api/health/ready covers the live signal.
  publishedSimulatorKeys: registeredSimulatorIds,
  lessons,
  tiers,
});

if (errors.length > 0) {
  console.error("Tool bridge validation failed:");
  for (const error of errors) {
    if (error.kind === "registered_simulator_unreachable") {
      console.error(`- registered simulator "${error.simulatorId}" is not unlocked by any tier`);
    } else {
      console.error(`- lesson "${error.slug}": ${error.kind} (target=${error.target})`);
    }
  }
  process.exit(1);
}

console.log(
  `Tool bridges valid: ${lessons.length} simulator bridges across ${registeredSimulatorIds.length} registered simulators.`,
);
