import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

const { requireAdmin, execute, revalidatePath } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({ adminSetEnrollmentStatus: { execute } }),
}));
vi.mock("next/cache", () => ({ revalidatePath }));

import { adminSetEnrollmentStatusAction } from "@/app/actions/adminSetEnrollmentStatus.action";

describe("adminSetEnrollmentStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("injects the authenticated admin actor and revalidates the detail page", async () => {
    execute.mockResolvedValue(
      Result.ok({ enrollment: { id: "enrollment-1" }, changed: true, change: "granted" }),
    );

    const result = await adminSetEnrollmentStatusAction({
      userId: "student-1",
      courseId: "course-1",
      status: "active",
    });

    expect(execute).toHaveBeenCalledWith({
      userId: "student-1",
      courseId: "course-1",
      status: "active",
      actorId: "admin-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users/student-1");
    expect(result).toEqual({ ok: true, changed: true, change: "granted" });
  });

  it("returns a stable error code without revalidating on failure", async () => {
    execute.mockResolvedValue(Result.err({ kind: "refunded_enrollment" }));

    const result = await adminSetEnrollmentStatusAction({
      userId: "student-1",
      courseId: "course-1",
      status: "active",
    });

    expect(result).toEqual({ ok: false, error: "refunded_enrollment" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
