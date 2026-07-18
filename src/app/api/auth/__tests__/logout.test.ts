/**
 * logout.test.ts — TDD coverage for /api/auth/logout route.
 *
 * The route is a thin shell around the Logout use case + cookie
 * clearing + redirect. The hardest-to-test part is the request
 * parsing — specifically, extracting the session token from the
 * cookie header. We test the extraction function directly (the
 * route is so thin that a full integration test would be more
 * trouble than value).
 *
 * What we test:
 * - Extracts the token from a single-cookie header
 * - Returns empty string when the cookie is missing
 * - Handles URL-encoded cookie values
 * - Handles multiple cookies in the header
 * - Handles the path-prefix form `cookie1=...; amph_session=...`
 * - Handles the path-prefix form when amph_session is first
 *
 * Note: we import the route module to test its exported handler
 * behavior; if the route only exports POST (no GET), that's a
 * security property worth asserting.
 */

import { describe, it, expect, vi } from "vitest";

// Mock server-only so next/headers can be imported in a non-Next context.
vi.mock("server-only", () => ({}));

// Mock the auth helpers so we don't need a real Next runtime.
vi.mock("@/lib/auth", () => ({
  clearAuthCookie: vi.fn(async () => undefined),
}));

// Mock the container so we don't need to wire up the full prod container.
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    logout: {
      execute: vi.fn(async () => ({ ok: true, value: undefined })),
    },
  }),
}));

import { POST, extractSessionToken } from "@/app/api/auth/logout/route";

describe("extractSessionToken", () => {
  it("extracts the token from a single-cookie header", () => {
    const token = extractSessionToken({
      headers: new Headers({ cookie: "amph_session=abc123" }),
    } as Request);
    expect(token).toBe("abc123");
  });

  it("returns empty string when the cookie is missing", () => {
    const token = extractSessionToken({
      headers: new Headers({}),
    } as Request);
    expect(token).toBe("");
  });

  it("returns empty string when the header is not set", () => {
    const token = extractSessionToken({
      headers: new Headers({ cookie: "" }),
    } as Request);
    expect(token).toBe("");
  });

  it("handles multiple cookies in the header", () => {
    const token = extractSessionToken({
      headers: new Headers({
        cookie: "other=foo; amph_session=the-jwt-token; another=bar",
      }),
    } as Request);
    expect(token).toBe("the-jwt-token");
  });

  it("handles URL-encoded cookie values", () => {
    const token = extractSessionToken({
      headers: new Headers({
        cookie: "amph_session=eyJhbGciOiJIUzI1NiJ9%3D.eyJzdWIiOiJ4In0.sig",
      }),
    } as Request);
    expect(token).toBe("eyJhbGciOiJIUzI1NiJ9=.eyJzdWIiOiJ4In0.sig");
  });

  it("handles amph_session as the first cookie (with no leading semicolon)", () => {
    const token = extractSessionToken({
      headers: new Headers({
        cookie: "amph_session=first; other=second",
      }),
    } as Request);
    expect(token).toBe("first");
  });
});

describe("POST /api/auth/logout", () => {
  it("returns a 303 redirect to /login", async () => {
    const request = new Request("https://example.com/api/auth/logout", {
      method: "POST",
      headers: { cookie: "amph_session=any-token" },
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("does not export a GET handler (CSRF hardening)", async () => {
    // The route module should only export POST. Allowing GET is a
    // CSRF risk and breaks HTTP semantics (GET should be idempotent).
    const routeModule = await import("@/app/api/auth/logout/route");
    expect((routeModule as { GET?: unknown }).GET).toBeUndefined();
  });

  it("redirects even when the cookie is missing (graceful fallback)", async () => {
    const request = new Request("https://example.com/api/auth/logout", {
      method: "POST",
      headers: {},
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login");
  });
});
