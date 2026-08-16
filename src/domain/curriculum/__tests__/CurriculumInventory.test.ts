import { describe, expect, it } from "vitest";
import {
  buildCurriculumInventory,
  parseCurriculumInventoryManifest,
  type CurriculumInventoryManifest,
  type CurriculumSourceGroup,
} from "@/domain/curriculum/CurriculumInventory";

function sourceGroup(
  courseSlug: string,
  lessons: Array<Partial<CurriculumSourceGroup["lessons"][number]> & { slug: string }>,
): CurriculumSourceGroup {
  return {
    courseSlug,
    lessons: lessons.map((lesson) => ({
      title: lesson.title ?? lesson.slug,
      slug: lesson.slug,
      moduleNumber: lesson.moduleNumber ?? 0,
      lessonNumber: lesson.lessonNumber ?? 1,
      type: lesson.type ?? "reading",
      estimatedMinutes: lesson.estimatedMinutes ?? 10,
      xpReward: lesson.xpReward ?? 50,
      sourcePath: lesson.sourcePath ?? `${lesson.slug}.mdx`,
    })),
  };
}

function manifest(
  lessons: CurriculumInventoryManifest["lessons"],
): CurriculumInventoryManifest {
  return {
    schemaVersion: 1,
    courses: {
      "ppc-foundations": { tier: "pp-foundations" },
      "accelerated-mastery": { tier: "accelerated-mastery" },
    },
    lessons,
  };
}

const lessonContract = {
  slug: "1.1-read-ppc-data-before-you-change-it",
  toolBridge: { kind: "none" as const },
  resourceRefs: ["mdx:1.1-read-ppc-data-before-you-change-it"],
  finalDeliverable: "A one-line decision note",
};

describe("CurriculumInventory", () => {
  it("enriches every source lesson with its tier, tool bridge, resources, and deliverable", () => {
    const result = buildCurriculumInventory(
      [
        sourceGroup("ppc-foundations", [
          {
            ...lessonContract,
            title: "Read PPC data before you change it",
            estimatedMinutes: 15,
            xpReward: 75,
            moduleNumber: 1,
          },
        ]),
      ],
      manifest([lessonContract]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      schemaVersion: 1,
      lessons: [
        {
          slug: lessonContract.slug,
          title: "Read PPC data before you change it",
          courseSlug: "ppc-foundations",
          tier: "pp-foundations",
          moduleNumber: 1,
          lessonNumber: 1,
          type: "reading",
          plannedMinutes: 15,
          xpReward: 75,
          toolBridge: { kind: "none" },
          resourceRefs: ["mdx:1.1-read-ppc-data-before-you-change-it"],
          finalDeliverable: "A one-line decision note",
          sourcePath: "1.1-read-ppc-data-before-you-change-it.mdx",
        },
      ],
    });
  });

  it("keeps inventory rows ordered by module and lesson number", () => {
    const laterLesson = {
      ...lessonContract,
      slug: "2.1-match-types",
      moduleNumber: 2,
      lessonNumber: 1,
    };
    const earlierLesson = {
      ...lessonContract,
      slug: "0.1-welcome",
      moduleNumber: 0,
      lessonNumber: 1,
    };

    const result = buildCurriculumInventory(
      [
        sourceGroup("ppc-foundations", [laterLesson, earlierLesson]),
      ],
      manifest([laterLesson, earlierLesson]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lessons.map((lesson) => lesson.slug)).toEqual([
      "0.1-welcome",
      "2.1-match-types",
    ]);
  });

  it("rejects duplicate source slugs and missing source minutes", () => {
    const result = buildCurriculumInventory(
      [
        sourceGroup("ppc-foundations", [
          { ...lessonContract, estimatedMinutes: 0 },
          { ...lessonContract, lessonNumber: 2 },
        ]),
      ],
      manifest([lessonContract]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.map((error) => error.kind)).toEqual(
      expect.arrayContaining(["duplicate_source_slug", "missing_minutes"]),
    );
  });

  it("rejects a lesson whose course has no tier mapping", () => {
    const result = buildCurriculumInventory(
      [sourceGroup("unmapped-course", [lessonContract])],
      manifest([lessonContract]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "missing_tier_mapping", courseSlug: "unmapped-course" }),
      ]),
    );
  });

  it("rejects a simulator bridge without a target", () => {
    const malformedManifest = {
      ...manifest([lessonContract]),
      lessons: [
        {
          ...lessonContract,
          toolBridge: { kind: "simulator" },
        },
      ],
    };
    const parsed = parseCurriculumInventoryManifest({
      ...malformedManifest,
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;

    expect(parsed.error.map((error) => error.kind)).toContain("missing_tool_target");
  });

  it("rejects manifest lessons that do not exist in the source", () => {
    const result = buildCurriculumInventory(
      [sourceGroup("ppc-foundations", [lessonContract])],
      manifest([
        lessonContract,
        {
          slug: "missing-from-source",
          toolBridge: { kind: "none" },
          resourceRefs: [],
          finalDeliverable: null,
        },
      ]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "orphan_manifest_lesson", slug: "missing-from-source" }),
      ]),
    );
  });
});
