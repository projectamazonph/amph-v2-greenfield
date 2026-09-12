/**
 * OAuthAccount entity tests (P1-04).
 *
 * Pins: provider allowlist, blank-id rejection, and the token
 * refresh gate.
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import {
  createOAuthAccount,
  isOAuthProvider,
  refreshOAuthTokens,
} from "@/domain/entities/OAuthAccount";

describe("isOAuthProvider", () => {
  it("accepts the schema allowlist", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("facebook")).toBe(true);
    expect(isOAuthProvider("github")).toBe(true);
  });

  it.each([[""], ["twitter"], ["Google"]])("rejects %s", (provider) => {
    expect(isOAuthProvider(provider)).toBe(false);
  });
});

describe("createOAuthAccount", () => {
  it("links a user to a provider identity", () => {
    const result = createOAuthAccount({
      id: "oa-1",
      userId: "user-1",
      provider: "google",
      providerUserId: "google-123",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.accessToken).toBeNull();
      expect(result.value.expiresAt).toBeNull();
    }
  });

  it.each([
    ["invalid_user_id", { userId: "  " }],
    ["invalid_provider", { provider: "twitter" }],
    ["invalid_provider_user_id", { providerUserId: "" }],
  ])("rejects %s", (kind, overrides) => {
    const result = createOAuthAccount({
      id: "oa-1",
      userId: "user-1",
      provider: "google",
      providerUserId: "google-123",
      ...overrides,
    });

    expect(result).toEqual(Result.err({ kind }));
  });
});

describe("refreshOAuthTokens", () => {
  it("replaces tokens and stamps the write", () => {
    const created = createOAuthAccount({
      id: "oa-1",
      userId: "user-1",
      provider: "google",
      providerUserId: "google-123",
    });
    if (Result.isErr(created)) throw new Error("setup failed");

    const refreshed = refreshOAuthTokens(created.value, {
      accessToken: "new-token",
      expiresAt: new Date("2026-09-12T00:00:00Z"),
      updatedAt: new Date("2026-09-11T01:00:00Z"),
    });

    expect(Result.isOk(refreshed)).toBe(true);
    if (Result.isOk(refreshed)) {
      expect(refreshed.value.accessToken).toBe("new-token");
    }
  });

  it("rejects a NaN expiry", () => {
    const created = createOAuthAccount({
      id: "oa-1",
      userId: "user-1",
      provider: "google",
      providerUserId: "google-123",
    });
    if (Result.isErr(created)) throw new Error("setup failed");

    expect(
      refreshOAuthTokens(created.value, {
        accessToken: "t",
        expiresAt: new Date(NaN),
        updatedAt: new Date(),
      }),
    ).toEqual(Result.err({ kind: "invalid_expires_at" }));
  });
});
