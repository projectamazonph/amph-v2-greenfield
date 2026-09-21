/**
 * welcome.action.test.ts — STORY-146.
 *
 * Tests the thin server-action wrappers around `CompleteWelcome` and
 * `ResetWelcome` use cases. The use-case logic is already covered by
 * `src/usecases/__tests__/CompleteWelcome.test.ts` and
 * `src/usecases/__tests__/ResetWelcome.test.ts`. What's covered here is
 * the action layer: session resolution, redirect/error mapping that
 * the page (Task 9) and the profile restart link (Task 12) consume,
 * and forwarding the authenticated userId to the use case.
 *
 * `resetWelcomeAction` is now a `<form action>` target (Task 12):
 * it returns `Promise<void>` and calls `redirect()` from
 * `next/navigation` on every path. We mock `redirect` to throw
 * `NEXT_REDIRECT` (same pattern as `student-event-boundaries.test.ts`
 * and the `/welcome` page test) and assert on the target URL.
 *
 * Mirrors `markLessonComplete.action.test.ts`'s mock style
 * (`vi.hoisted` + `vi.mock` for `@/lib/auth` + `@/composition/container`).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionUser, completeExecute, resetExecute, redirect } = vi.hoisted(() => ({
  getSessionUser: vi.fn<() => Promise<unknown>>(),
  completeExecute: vi.fn(),
  resetExecute: vi.fn(),
  redirect: vi.fn((url: string): never => {
    throw Object.assign(new Error(`REDIRECT:${url}`), { digest: "NEXT_REDIRECT" });
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));

vi.mock("@/lib/auth", () => ({ getSessionUser }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    completeWelcome: { execute: completeExecute },
    resetWelcome: { execute: resetExecute },
  }),
}));

import { completeWelcomeAction, resetWelcomeAction } from "../welcome.action";

function formData(): FormData {
  const form = new FormData();
  return form;
}

beforeEach(() => {
  getSessionUser.mockReset();
  completeExecute.mockReset();
  resetExecute.mockReset();
  redirect.mockClear();
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

  it("passes a use-case not_found through to the action envelope", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    completeExecute.mockResolvedValue({
      ok: false,
      error: { kind: "not_found" },
    });

    const result = await completeWelcomeAction();

    expect(result).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  it("passes a use-case repo_error through with its message", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    completeExecute.mockResolvedValue({
      ok: false,
      error: { kind: "repo_error", message: "connection refused" },
    });

    const result = await completeWelcomeAction();

    expect(result).toEqual({
      ok: false,
      error: { kind: "repo_error", message: "connection refused" },
    });
  });
});

describe("resetWelcomeAction", () => {
  it("redirects to /login when there is no session", async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(resetWelcomeAction(formData())).rejects.toThrow("REDIRECT:/login");
    expect(resetExecute).not.toHaveBeenCalled();
  });

  it("forwards the authenticated userId and redirects to /welcome on success", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    resetExecute.mockResolvedValue({ ok: true, value: undefined });

    await expect(resetWelcomeAction(formData())).rejects.toThrow("REDIRECT:/welcome");
    expect(resetExecute).toHaveBeenCalledTimes(1);
    expect(resetExecute).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("redirects to /profile?welcome=reset_failed when the use case returns an error", async () => {
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    resetExecute.mockResolvedValue({ ok: false, error: { kind: "not_found" } });

    await expect(resetWelcomeAction(formData())).rejects.toThrow(
      "REDIRECT:/profile?welcome=reset_failed",
    );
    expect(resetExecute).toHaveBeenCalledTimes(1);
  });

  it("ignores formData and resolves the user purely from the session", async () => {
    // Defence-in-depth: the profile page only ever invokes this action
    // with the default FormData (the form has no fields). Even if a
    // caller passed extra fields, the session is the single source of
    // truth for which user's welcome gets reset.
    getSessionUser.mockResolvedValue({ id: "user-1", email: "u@test.example.com" });
    resetExecute.mockResolvedValue({ ok: true, value: undefined });

    const fd = new FormData();
    fd.set("userId", "spoofed-value");
    fd.set("welcomeCompletedAt", "never");

    await expect(resetWelcomeAction(fd)).rejects.toThrow("REDIRECT:/welcome");
    expect(resetExecute).toHaveBeenCalledWith({ userId: "user-1" });
  });
});
