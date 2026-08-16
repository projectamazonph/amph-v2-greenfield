import { describe, expect, it } from "vitest";
import inventoryManifest from "../../../../content/curriculum/inventory.json";
import { NodeContentReader } from "@/infra/content/NodeContentReader";
import {
  buildCurriculumInventory,
  parseCurriculumInventoryManifest,
} from "@/domain/curriculum/CurriculumInventory";
import { PUBLIC_CURRICULUM_CLAIMS } from "@/domain/curriculum/PublicCurriculumClaims";

describe("public curriculum claim contract", () => {
  it("matches the approved claims to the checked-in source inventory", async () => {
    const manifestResult = parseCurriculumInventoryManifest(inventoryManifest);
    expect(manifestResult.ok).toBe(true);
    if (!manifestResult.ok) return;

    const sourceResult = await new NodeContentReader().readAll();
    expect(sourceResult.ok).toBe(true);
    if (!sourceResult.ok) return;

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
    expect(inventoryResult.ok).toBe(true);
    if (!inventoryResult.ok) return;

    for (const [courseSlug, claim] of Object.entries(PUBLIC_CURRICULUM_CLAIMS.courses)) {
      const lessons = inventoryResult.value.lessons.filter((lesson) => lesson.courseSlug === courseSlug);
      expect(claim.tier).toBe(manifestResult.value.courses[courseSlug]?.tier);
      expect(lessons).toHaveLength(claim.lessonCount);
      expect(lessons.reduce((total, lesson) => total + lesson.plannedMinutes, 0)).toBe(
        claim.plannedMinutes,
      );
      expect([...new Set(lessons.map((lesson) => lesson.moduleNumber))].sort()).toEqual(
        [...claim.moduleNumbers].sort(),
      );
    }

    expect(PUBLIC_CURRICULUM_CLAIMS.modules).toHaveLength(
      new Set(inventoryResult.value.lessons.map((lesson) => lesson.moduleNumber)).size,
    );
    for (const module of PUBLIC_CURRICULUM_CLAIMS.modules) {
      const lessons = inventoryResult.value.lessons.filter(
        (lesson) => lesson.moduleNumber === module.moduleNumber,
      );
      expect(lessons).toHaveLength(module.lessonCount);
      expect(lessons.reduce((total, lesson) => total + lesson.plannedMinutes, 0)).toBe(
        module.plannedMinutes,
      );
      expect(lessons.every((lesson) => lesson.courseSlug === module.courseSlug)).toBe(true);
    }
    const inventoryTools = new Set(
      inventoryResult.value.lessons
        .filter((lesson) => lesson.toolBridge.kind === "simulator")
        .map((lesson) => lesson.toolBridge.target),
    );
    expect(Object.keys(PUBLIC_CURRICULUM_CLAIMS.simulators).sort()).toEqual(
      [...inventoryTools].sort(),
    );
    expect(
      [...(PUBLIC_CURRICULUM_CLAIMS.tierSimulatorTargets["accelerated-mastery"] ?? [])].sort(),
    ).toEqual([...inventoryTools].sort());
  });
});
