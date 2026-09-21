/**
 * welcome.action.test.ts — STORY-129.
 *
 * Tests the thin server-action wrappers around `CompleteWelcome` and
 * `ResetWelcome` use cases. The use-case logic is already covered by
 * `src/usecases/__tests__/CompleteWelcome.test.ts` and
 * `src/usecases/__tests__/ResetWelcome.test.ts`. What's covered here is
 * the action layer: session resolution, error mapping to a discriminated
 * union the page (Task 9) and the profile restart link (Task 12) can
 * consume, and forwarding the authenticated userId to the use case.
 *
 * Mirrors `markLessonComplete.action.test.ts`'s mock style
 * (`vi.hoisted` + `vi.mock` for `@/lib/auth` + `@/composition/container`).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionUser, completeExecute, resetExecute } = vi.hoisted(() => ({
  getSessionUser: vi.fn<() => Promise<unknown>>(),
  completeExecute: vi.fn(),
  resetExecute: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    completeWelcome: { execute: completeExecute },
    resetWelcome: { execute: resetExecute },
  }),
}));

import { completeWelcomeAction, resetWelcomeAction } from "../welcome.action";

beforeEach(() => {
  getSessionUser.mockReset();
  completeExecute.mockReset();
  resetExecute.mockReset();
});

describe("completeWelcomeAction", () => {
  it("returns not_authenticated when there is no session", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await completeWelcomeAction();

    expect(result).toEqual({ ok: false, error: { kind: "not_authenticated" } });
    expect(completeExecute).not.toHaveBeenCalled();
  });

  it("forwards the authenticated userId and returns the completedAt timestamp on success", async () => {
    const completedAt = new Date("2026-09-20T10:00:00.000Z");
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    completeExecute.mockResolvedValue({ ok: true, value: { completedAt } });

    const result = await completeWelcomeAction();

    expect(completeExecute).toHaveBeenCalledTimes(1);
    expect(completeExecute).toHaveBeenCalledWith({ userId: "user-1" });
    expect(result).toEqual({ ok: true, value: { completedAt } });
  });

  it("maps a use-case error to the action's error envelope", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    completeExecute.mockResolvedValue({
      ok: false,
      error: { kind: "not_found" },
    });

    const result = await completeWelcomeAction();

    expect(result).toEqual({ ok: false, error: { kind: "error", message: "unknown" } });
  });
});

describe("resetWelcomeAction", () => {
  it("returns not_authenticated when there is no session", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await resetWelcomeAction();

    expect(result).toEqual({ ok: false, error: { kind: "not_authenticated" } });
    expect(resetExecute).not.toHaveBeenCalled();
  });

  it("forwards the authenticated userId and returns ok on success", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    resetExecute.mockResolvedValue({ ok: true, value: undefined });

    const result = await resetWelcomeAction();

    expect(resetExecute).toHaveBeenCalledTimes(1);
    expect(resetExecute).toHaveBeenCalledWith({ userId: "user-1" });
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("maps a use-case error to the action's error envelope", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    resetExecute.mockResolvedValue({ ok: false, error: { kind: "not_found" } });

    const result = await resetWelcomeAction();

    expect(result).toEqual({ ok: false, error: { kind: "error", message: "unknown" } });
  });
});
