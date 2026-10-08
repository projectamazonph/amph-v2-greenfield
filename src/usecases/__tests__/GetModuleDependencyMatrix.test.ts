import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import { Money } from "@/domain/values/Money";
import type { Course } from "@/domain/entities/Course";
import type { Module } from "@/domain/entities/Module";
import type { Prerequisite } from "@/domain/entities/Prerequisite";
import { GetModuleDependencyMatrix } from "../GetModuleDependencyMatrix";
import { InMemoryPrerequisiteRepository } from "@/infra/repositories/inmemory/InMemoryPrerequisiteRepository";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";

function makeCourse(id: string, slug: string, title: string, displayOrder: number): Course {
  const priceRes = Money.of(299900, "PHP");
  if (!priceRes.ok) throw new Error("Invalid money");
  return {
    id,
    slug,
    title,
    tagline: "",
    description: "",
    price: priceRes.value,
    coverImage: null,
    isFeatured: false,
    displayOrder,
    courseTier: "STARTER",
    previewLessonCount: 1,
    curriculum: { sections: [] },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    status: "PUBLISHED",
  };
}

function makeModule(id: string, courseId: string, title: string, displayOrder: number): Module {
  return {
    id,
    courseId,
    title,
    displayOrder,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("GetModuleDependencyMatrix", () => {
  it("returns matrix with hasPrerequisites=false when no rules are present", async () => {
    const courseRepo = {
      listAll: async () =>
        Result.ok([
          makeCourse("c1", "ppc-foundations", "PPC Foundations", 1),
          makeCourse("c2", "accelerated-mastery", "Accelerated Mastery", 2),
        ]),
      listPublished: async () => Result.ok([]),
      findById: async () => Result.err({ kind: "not_found" as const }),
      findBySlug: async () => Result.err({ kind: "not_found" as const }),
      create: async () => Result.err({ kind: "db_error" as const, message: "" }),
      update: async () => Result.err({ kind: "not_found" as const }),
      archive: async () => Result.err({ kind: "not_found" as const }),
    };

    const moduleRepo = new InMemoryModuleRepository();
    await moduleRepo.create(makeModule("m1", "c1", "Foundations", 1));
    await moduleRepo.create(makeModule("m2", "c1", "Keyword Research", 2));
    await moduleRepo.create(makeModule("m3", "c2", "Portfolio Strategy", 1));

    const prereqRepo = new InMemoryPrerequisiteRepository();

    const useCase = new GetModuleDependencyMatrix({
      courseRepo,
      moduleRepo,
      prerequisiteRepo: prereqRepo,
    });

    const res = await useCase.execute();
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.hasPrerequisites).toBe(false);
    expect(res.value.totalPrerequisiteRules).toBe(0);
    expect(res.value.modules.length).toBe(3);
    expect(res.value.matrix.length).toBe(3);

    // Diagonal cell is SELF
    expect(res.value.matrix[0]?.[0]?.cellType).toBe("SELF");
    // Off-diagonal cell with no rules is NONE
    expect(res.value.matrix[0]?.[1]?.cellType).toBe("NONE");
  });

  it("builds PREREQUISITE and DEPENDENT cells when prerequisite rules exist", async () => {
    const courseRepo = {
      listAll: async () =>
        Result.ok([
          makeCourse("c1", "ppc-foundations", "PPC Foundations", 1),
          makeCourse("c2", "accelerated-mastery", "Accelerated Mastery", 2),
        ]),
      listPublished: async () => Result.ok([]),
      findById: async () => Result.err({ kind: "not_found" as const }),
      findBySlug: async () => Result.err({ kind: "not_found" as const }),
      create: async () => Result.err({ kind: "db_error" as const, message: "" }),
      update: async () => Result.err({ kind: "not_found" as const }),
      archive: async () => Result.err({ kind: "not_found" as const }),
    };

    const moduleRepo = new InMemoryModuleRepository();
    await moduleRepo.create(makeModule("m1", "c1", "Foundations", 1));
    await moduleRepo.create(makeModule("m2", "c2", "Portfolio Strategy", 1));

    const prereqRepo = new InMemoryPrerequisiteRepository();
    const prereq: Prerequisite = {
      id: "p1",
      courseId: "c2", // c2 requires c1
      requiresCourseId: "c1",
      requiresLessonId: null,
      createdAt: new Date(),
      deletedAt: null,
      createdById: "admin-1",
      updatedById: "admin-1",
    };
    await prereqRepo.create(prereq);

    const useCase = new GetModuleDependencyMatrix({
      courseRepo,
      moduleRepo,
      prerequisiteRepo: prereqRepo,
    });

    const res = await useCase.execute();
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.hasPrerequisites).toBe(true);
    expect(res.value.totalPrerequisiteRules).toBe(1);

    // Row 0 (m1, course c1) vs Col 1 (m2, course c2):
    // Course c2 requires Course c1. So m1 is a PREREQUISITE for m2.
    const cell01 = res.value.matrix[0]?.[1];
    expect(cell01?.cellType).toBe("PREREQUISITE");
    expect(cell01?.ruleSummary).toContain("is required for");

    // Row 1 (m2, course c2) vs Col 0 (m1, course c1):
    // Course c2 requires Course c1. So m2 DEPENDS on m1.
    const cell10 = res.value.matrix[1]?.[0];
    expect(cell10?.cellType).toBe("DEPENDENT");
    expect(cell10?.ruleSummary).toContain("depends on");
  });

  it("filters modules to 9x9 when range='core'", async () => {
    const courseRepo = {
      listAll: async () => Result.ok([makeCourse("c1", "ppc-foundations", "PPC Foundations", 1)]),
      listPublished: async () => Result.ok([]),
      findById: async () => Result.err({ kind: "not_found" as const }),
      findBySlug: async () => Result.err({ kind: "not_found" as const }),
      create: async () => Result.err({ kind: "db_error" as const, message: "" }),
      update: async () => Result.err({ kind: "not_found" as const }),
      archive: async () => Result.err({ kind: "not_found" as const }),
    };

    const moduleRepo = new InMemoryModuleRepository();
    for (let i = 1; i <= 12; i++) {
      await moduleRepo.create(makeModule(`m${i}`, "c1", `Module ${i}`, i));
    }

    const prereqRepo = new InMemoryPrerequisiteRepository();

    const useCase = new GetModuleDependencyMatrix({
      courseRepo,
      moduleRepo,
      prerequisiteRepo: prereqRepo,
    });

    const res = await useCase.execute({ range: "core" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.modules.length).toBe(9);
    expect(res.value.matrix.length).toBe(9);
    expect(res.value.matrix[0]?.length).toBe(9);
  });
});
