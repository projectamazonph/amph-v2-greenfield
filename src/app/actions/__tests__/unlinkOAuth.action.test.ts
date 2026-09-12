/**
 * unlinkOAuth.action tests (P1-04).
 *
 * Pins: anonymous callers bounce to /login, unknown providers are
 * rejected, and use-case failures surface as security-page error
 * codes while success lands on the unlinked notice.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));

const { getSessionUserId, execute, redirect } = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  execute: vi.fn(),
  redirect: vi.fn((location: string): never => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ getSessionUserId }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({ unlinkOAuthAccount: { execute } }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import { unlinkOAuthAction } from "@/app/actions/unlinkOAuth.action";

function form(provider: string): FormData {
  const data = new FormData();
  data.append("provider", provider);
  return data;
}

beforeEach(() => {
  getSessionUserId.mockReset();
  execute.mockReset();
  redirect.mockClear();
});

describe("unlinkOAuthAction", () => {
  it("bounces anonymous callers to /login", async () => {
    getSessionUserId.mockResolvedValue(null);

    await expect(unlinkOAuthAction(form("google"))).rejects.toThrow("REDIRECT:/login");
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects unknown providers before touching the use case", async () => {
    getSessionUserId.mockResolvedValue("user-1");

    await expect(unlinkOAuthAction(form("twitter"))).rejects.toThrow(
      "REDIRECT:/profile/security?error=oauth_unknown",
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("lands on the unlinked notice on success", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    execute.mockResolvedValue(Result.ok(undefined));

    await expect(unlinkOAuthAction(form("google"))).rejects.toThrow(
      "REDIRECT:/profile/security?unlinked=1",
    );
    expect(execute).toHaveBeenCalledWith({ userId: "user-1", provider: "google" });
  });

  it("surfaces the last-method guard as an error code", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    execute.mockResolvedValue(Result.err({ kind: "last_auth_method" }));

    await expect(unlinkOAuthAction(form("google"))).rejects.toThrow(
      "REDIRECT:/profile/security?error=last_auth_method",
    );
  });
});
