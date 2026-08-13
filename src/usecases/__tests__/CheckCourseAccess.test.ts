import { describe, expect, it } from "vitest";
import { CheckCourseAccess } from "../CheckCourseAccess";
import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";

describe("CheckCourseAccess", () => {
  it("preserves the tier details when a student's plan is too low", async () => {
    const accessPolicy: IAccessPolicy = {
      canAccess: async () => ({
        kind: "denied_tier",
        userTier: "STARTER",
        requiredTier: "ULTIMATE",
      }),
    };

    const result = await new CheckCourseAccess(accessPolicy).execute({
      userId: "student-1",
      courseId: "course-1",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "access_denied",
        reason: "tier",
        tier: "STARTER",
        requiredTier: "ULTIMATE",
      },
    });
  });

  it("identifies an access verification failure separately from a plan denial", async () => {
    const accessPolicy: IAccessPolicy = {
      canAccess: async () => ({ kind: "denied_not_authenticated" }),
    };

    const result = await new CheckCourseAccess(accessPolicy).execute({
      userId: "student-1",
      courseId: "course-1",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "access_denied",
        reason: "not_authenticated",
        tier: undefined,
        requiredTier: undefined,
      },
    });
  });
});
