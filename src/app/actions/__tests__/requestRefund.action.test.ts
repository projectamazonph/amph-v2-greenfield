import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  execute: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUserId: mocks.getSessionUserId }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({ requestRefund: { execute: mocks.execute } }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { requestRefundAction } from "../requestRefund.action";

function form(orderId = "order-1", reason = "The course is not right for my role.") {
  const data = new FormData();
  data.set("orderId", orderId);
  data.set("reason", reason);
  return data;
}

describe("requestRefundAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUserId.mockResolvedValue("student-1");
    mocks.execute.mockResolvedValue({ ok: true, value: { id: "order-1" } });
  });

  it("requires authentication", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);

    await expect(requestRefundAction(form())).rejects.toThrow(
      "redirect:/login?redirect=%2Fprofile%2Fpurchases",
    );
  });

  it("submits the authenticated student's request and refreshes purchases", async () => {
    await expect(requestRefundAction(form())).rejects.toThrow(
      "redirect:/profile/purchases?refundRequested=1",
    );

    expect(mocks.execute).toHaveBeenCalledWith({
      userId: "student-1",
      orderId: "order-1",
      reason: "The course is not right for my role.",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile/purchases");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/refunds");
  });

  it("returns an eligibility error without exposing internals", async () => {
    mocks.execute.mockResolvedValue({
      ok: false,
      error: { kind: "completion_limit_reached", progressPercent: 25 },
    });

    await expect(requestRefundAction(form())).rejects.toThrow(
      "redirect:/profile/purchases?refundError=completion_limit_reached",
    );
  });
});
