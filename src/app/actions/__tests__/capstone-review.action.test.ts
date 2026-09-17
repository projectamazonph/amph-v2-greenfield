import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireAdmin, returnCapstone, passCapstone } = vi.hoisted(() => ({
  requireAdmin: vi.fn<() => Promise<{ id: string }>>(),
  returnCapstone: vi.fn(),
  passCapstone: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    returnCapstoneForReview: { execute: returnCapstone },
    passCapstoneReview: { execute: passCapstone },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { passCapstoneAction, returnCapstoneAction } from "../capstone-review.action";

beforeEach(() => {
  requireAdmin.mockReset();
  returnCapstone.mockReset();
  passCapstone.mockReset();
  requireAdmin.mockResolvedValue({ id: "admin-1" });
});

describe("returnCapstoneAction", () => {
  it("returns with the admin identity", async () => {
    returnCapstone.mockResolvedValue({
      ok: true,
      value: { id: "cap-1", status: "NEEDS_REVISION" },
    });
    const result = await returnCapstoneAction({
      submissionId: "cap-1",
      note: "Fix the readout.",
    });
    expect(result).toEqual({ ok: true, value: { id: "cap-1", status: "NEEDS_REVISION" } });
    expect(returnCapstone).toHaveBeenCalledWith({
      actorId: "admin-1",
      submissionId: "cap-1",
      note: "Fix the readout.",
    });
  });

  it("maps domain errors through", async () => {
    returnCapstone.mockResolvedValue({ ok: false, error: { kind: "missing_note" } });
    const result = await returnCapstoneAction({ submissionId: "cap-1", note: "" });
    expect(result).toEqual({ ok: false, error: { kind: "missing_note" } });
  });
});

describe("passCapstoneAction", () => {
  it("passes with the admin identity", async () => {
    passCapstone.mockResolvedValue({
      ok: true,
      value: { id: "cap-1", status: "PASSED" },
    });
    const result = await passCapstoneAction({ submissionId: "cap-1" });
    expect(result).toEqual({ ok: true, value: { id: "cap-1", status: "PASSED" } });
    expect(passCapstone).toHaveBeenCalledWith({
      actorId: "admin-1",
      submissionId: "cap-1",
    });
  });

  it("maps the six-id gate through", async () => {
    passCapstone.mockResolvedValue({ ok: false, error: { kind: "missing_artefacts" } });
    const result = await passCapstoneAction({ submissionId: "cap-1" });
    expect(result).toEqual({ ok: false, error: { kind: "missing_artefacts" } });
  });
});
