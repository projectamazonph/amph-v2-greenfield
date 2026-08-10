import { describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";
import { GetAdminContentStats } from "@/usecases/GetAdminContentStats";

describe("GetAdminContentStats", () => {
  it("counts courses, modules, and lessons across the content tree", async () => {
    const courseRepo = {
      listAll: vi.fn().mockResolvedValue(Result.ok([{ id: "c1" }, { id: "c2" }])),
    };
    const moduleRepo = {
      findByCourseId: vi.fn(async (courseId: string) =>
        Result.ok(courseId === "c1" ? [{ id: "m1" }, { id: "m2" }] : [{ id: "m3" }]),
      ),
    };
    const lessonRepo = {
      findByModuleId: vi.fn(async (moduleId: string) =>
        Result.ok(moduleId === "m2" ? [{ id: "l2" }, { id: "l3" }] : [{ id: "l1" }]),
      ),
    };

    const result = await new GetAdminContentStats({
      courseRepo: courseRepo as never,
      moduleRepo: moduleRepo as never,
      lessonRepo: lessonRepo as never,
    }).execute();

    expect(result).toEqual({
      ok: true,
      value: { courseCount: 2, moduleCount: 3, lessonCount: 4 },
    });
  });

  it("returns a database error instead of displaying made-up zero counts", async () => {
    const result = await new GetAdminContentStats({
      courseRepo: {
        listAll: vi.fn().mockResolvedValue(Result.err({ kind: "db_error", message: "down" })),
      } as never,
      moduleRepo: {} as never,
      lessonRepo: {} as never,
    }).execute();

    expect(result).toEqual({ ok: false, error: { kind: "db_error", message: "down" } });
  });
});
