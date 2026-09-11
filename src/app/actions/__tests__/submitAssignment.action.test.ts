/**
 * submitAssignment.action tests (P1-02).
 *
 * Pins: unauthorized callers are refused before touching the use
 * case, and the session identity is injected on the happy path.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));

const { getSessionUserId, execute } = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUserId }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({ submitAssignment: { execute } }),
}));

import { submitAssignmentAction } from "@/app/actions/submitAssignment.action";

beforeEach(() => {
  getSessionUserId.mockReset();
  execute.mockReset();
});

describe("submitAssignmentAction", () => {
  it("refuses anonymous callers without touching the use case", async () => {
    getSessionUserId.mockResolvedValue(null);

    const result = await submitAssignmentAction("assign-1");

    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(execute).not.toHaveBeenCalled();
  });

  it("injects the session identity", async () => {
    getSessionUserId.mockResolvedValue("student-1");
    execute.mockResolvedValue(Result.ok({ id: "assign-1" }));

    const result = await submitAssignmentAction("assign-1");

    expect(execute).toHaveBeenCalledWith({ userId: "student-1", assignmentId: "assign-1" });
    expect(result).toEqual({ ok: true, value: { id: "assign-1" } });
  });

  it("passes use-case errors through", async () => {
    getSessionUserId.mockResolvedValue("student-1");
    execute.mockResolvedValue(Result.err({ kind: "not_assignee" }));

    const result = await submitAssignmentAction("assign-1");

    expect(result).toEqual({ ok: false, error: { kind: "not_assignee" } });
  });
});
