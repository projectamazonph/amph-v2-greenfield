import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionUserId, submit, status } = vi.hoisted(() => ({
  getSessionUserId: vi.fn<() => Promise<string | null>>(),
  submit: vi.fn(),
  status: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUserId }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    submitCapstone: { execute: submit },
    getCapstoneStatus: { execute: status },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getCapstoneStatusAction, submitCapstoneAction } from "../capstone.action";

beforeEach(() => {
  getSessionUserId.mockReset();
  submit.mockReset();
  status.mockReset();
});

describe("submitCapstoneAction", () => {
  it("requires authentication", async () => {
    getSessionUserId.mockResolvedValue(null);
    const result = await submitCapstoneAction({ courseId: null });
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits with the session identity", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    submit.mockResolvedValue({ ok: true, value: { id: "cap-1", status: "SUBMITTED" } });
    const result = await submitCapstoneAction({ courseId: null });
    expect(result).toEqual({ ok: true, value: { id: "cap-1", status: "SUBMITTED" } });
    expect(submit).toHaveBeenCalledWith({
      actorId: "user-1",
      courseId: null,
      requiredKinds: [
        "listing-audit",
        "keyword-plan",
        "campaign-map",
        "decision-log",
        "triage-report",
        "weekly-readout",
      ],
    });
  });

  it("surfaces the missing list on not_ready", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    submit.mockResolvedValue({
      ok: false,
      error: { kind: "not_ready", missingKinds: ["keyword-plan"] },
    });
    const result = await submitCapstoneAction({ courseId: null });
    expect(result).toEqual({
      ok: false,
      error: { kind: "not_ready", missingKinds: ["keyword-plan"] },
    });
  });
});

describe("getCapstoneStatusAction", () => {
  it("requires authentication", async () => {
    getSessionUserId.mockResolvedValue(null);
    const result = await getCapstoneStatusAction();
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(status).not.toHaveBeenCalled();
  });

  it("returns the status view", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    status.mockResolvedValue({
      ok: true,
      value: {
        submission: null,
        ready: false,
        requiredKinds: ["listing-audit"],
        submittedKinds: [],
        missingKinds: ["listing-audit"],
      },
    });
    const result = await getCapstoneStatusAction();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ready).toBe(false);
    expect(result.value.missingKinds).toEqual(["listing-audit"]);
  });
});
