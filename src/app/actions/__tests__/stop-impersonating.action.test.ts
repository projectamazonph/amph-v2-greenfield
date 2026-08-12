import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  setAuthCookie: mocks.setAuthCookie,
  clearAuthCookie: mocks.clearAuthCookie,
}));

import { performStopImpersonating } from "../stopImpersonating.action";

function cookieJar(value?: string) {
  return {
    get: vi.fn((name: string) => (name === "amph_admin_session" && value ? { value } : undefined)),
    delete: vi.fn(),
  };
}

describe("performStopImpersonating", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restores the backed-up admin token and removes the backup cookie", async () => {
    const cookies = cookieJar("admin-token");
    const expiresAt = new Date("2026-08-20T00:00:00.000Z");
    const result = await performStopImpersonating({
      cookies,
      setSessionCookie: mocks.setAuthCookie,
      clearSessionCookie: mocks.clearAuthCookie,
      expiresAt,
    });

    expect(result).toEqual({ ok: true, value: { restored: true } });
    expect(mocks.setAuthCookie).toHaveBeenCalledWith("admin-token", expiresAt);
    expect(mocks.clearAuthCookie).not.toHaveBeenCalled();
    expect(cookies.delete).toHaveBeenCalledWith("amph_admin_session");
  });

  it("clears the impersonated session when no backup exists", async () => {
    const cookies = cookieJar();
    const result = await performStopImpersonating({
      cookies,
      setSessionCookie: mocks.setAuthCookie,
      clearSessionCookie: mocks.clearAuthCookie,
      expiresAt: new Date("2026-08-20T00:00:00.000Z"),
    });

    expect(result).toEqual({ ok: true, value: { restored: false } });
    expect(mocks.clearAuthCookie).toHaveBeenCalledOnce();
    expect(mocks.setAuthCookie).not.toHaveBeenCalled();
    expect(cookies.delete).toHaveBeenCalledWith("amph_admin_session");
  });
});
