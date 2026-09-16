import { describe, expect, it } from "vitest";
import { resolveOnboardingStatus, type OnboardingModuleRef } from "@/lib/onboardingComplete";

function lesson(
  id: string,
  displayOrder: number,
  estimatedMinutes = 10,
): OnboardingModuleRef["lessons"][number] {
  return { id, title: `Lesson ${id}`, displayOrder, estimatedMinutes };
}

function moduleRef(
  id: string,
  moduleNumber: number,
  lessons: OnboardingModuleRef["lessons"],
  title = `Module ${moduleNumber}`,
): OnboardingModuleRef {
  return { id, title, moduleNumber, displayOrder: moduleNumber, lessons };
}

describe("resolveOnboardingStatus", () => {
  it("returns missing_module_zero when there are no modules", () => {
    expect(resolveOnboardingStatus([], [])).toEqual({ kind: "missing_module_zero" });
  });

  it("returns module_zero_incomplete when any Module 0 lesson is missing", () => {
    const modules = [
      moduleRef("m0", 0, [lesson("l0-1", 1), lesson("l0-2", 2), lesson("l0-3", 3)]),
      moduleRef("m1", 1, [lesson("l1-1", 1)]),
    ];
    const status = resolveOnboardingStatus(modules, ["l0-1", "l0-2"]);
    expect(status).toEqual({ kind: "module_zero_incomplete", missingLessonCount: 1 });
  });

  it("returns complete with the first Module 1 lesson when Module 0 is fully done", () => {
    const modules = [
      moduleRef("m0", 0, [lesson("l0-1", 1, 8), lesson("l0-2", 2, 8), lesson("l0-3", 3, 10)]),
      moduleRef("m1", 1, [lesson("l1-1", 1, 12), lesson("l1-2", 2, 15)]),
    ];
    const status = resolveOnboardingStatus(modules, ["l0-1", "l0-2", "l0-3"]);
    expect(status.kind).toBe("complete");
    if (status.kind !== "complete") return;
    expect(status.nextLesson.id).toBe("l1-1");
    expect(status.nextModuleTitle).toBe("Module 1");
    expect(status.totalMinutes).toBe(27);
  });

  it("returns no_next_module when there is no Module 1", () => {
    const modules = [moduleRef("m0", 0, [lesson("l0-1", 1)])];
    const status = resolveOnboardingStatus(modules, ["l0-1"]);
    expect(status).toEqual({ kind: "no_next_module", nextModuleTitle: "Module 0" });
  });

  it("selects the module with the smallest moduleNumber as Module 0", () => {
    const modules = [
      moduleRef("m1", 1, [lesson("l1-1", 1)]),
      moduleRef("m0", 0, [lesson("l0-1", 1)]),
    ];
    const status = resolveOnboardingStatus(modules, ["l0-1"]);
    expect(status.kind).toBe("complete");
    if (status.kind !== "complete") return;
    expect(status.nextModuleTitle).toBe("Module 1");
  });
});
