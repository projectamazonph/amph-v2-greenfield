/**
 * src/lib/__tests__/auth.test.ts — STORY-046-prep-2.
 *
 * Tests the server-side session helpers in src/lib/auth.ts.
 *
 * The helpers consume `next/headers` cookies() and `next/navigation` redirect().
 * These cannot easily be mocked in vitest because both modules are deeply tied to
 * the Next.js runtime. We therefore:
 *
 * 1. Verify the **integration** with the test container directly: use
 *    `buildTestContainer()` to get a JoseJwtService + InMemoryUserRepository,
 *    then verify that the same call sequence auth.ts uses (jwt.sign → jwt.verify,
 *    userRepo.findById) works end-to-end. This catches the real-world bugs
 *    (secret mismatch, claim shape, repo not finding users) without mocking
 *    anything.
 *
 * 2. Verify the **public API surface** of auth.ts: that the exports exist with
 *    the right shape. The actual cookie + redirect behavior is exercised by
 *    Next.js' own runtime when the pages run, and by the future Playwright
 *    integration tests for /admin pages.
 *
 * 3. Verify the **cookie name selection** logic in isolation (a pure function
 *    exported as `_testInternals`).
 *
 * This approach is deliberately narrow: it catches the bugs we can catch
 * without a real Next runtime, and leaves the rest to integration tests.
 */

import { describe, it, expect, vi } from "vitest";

// Mock server-only so auth.ts can be imported in a non-Next context.
vi.mock("server-only", () => ({}));

import { JoseJwtService } from "@/infra/security/JoseJwtService";
import { buildTestContainer } from "@/composition/container.test";
import { _testInternals } from "@/lib/auth";

const SECRET = "test-secret-must-be-at-least-32-bytes-long-ok";
const USER_ID = "user-abc-123";

describe("auth.ts public API", () => {
  it("exports the expected functions", async () => {
    const auth = await import("@/lib/auth");
    expect(typeof auth.getSessionUserId).toBe("function");
    expect(typeof auth.getSessionUser).toBe("function");
    expect(typeof auth.requireAuth).toBe("function");
    expect(typeof auth.requireAdmin).toBe("function");
    expect(typeof auth.setAuthCookie).toBe("function");
    expect(typeof auth.clearAuthCookie).toBe("function");
  });

  it("exposes the cookie name constants via _testInternals", () => {
    expect(_testInternals.SESSION_COOKIE_DEV).toBe("amph_session");
    expect(_testInternals.SESSION_COOKIE_PROD).toBe("__Secure-amph_session");
    expect(_testInternals.COOKIE_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 7);
  });
});

describe("auth.ts integration: JWT sign/verify + user lookup", () => {
  it("can sign a token with the test container's JWT and verify it", async () => {
    const tc = buildTestContainer();
    const signResult = await tc.jwt.sign(
      { sub: USER_ID, role: "ADMIN" },
      "7d",
    );
    expect(signResult.ok).toBe(true);
    if (!signResult.ok) return;

    const verifyResult = await tc.jwt.verify(signResult.value);
    expect(verifyResult.ok).toBe(true);
    if (!verifyResult.ok) return;

    expect(verifyResult.value.sub).toBe(USER_ID);
    expect(verifyResult.value.role).toBe("ADMIN");
  });

  it("can look up a seeded user by ID", async () => {
    const tc = buildTestContainer();
    await tc.userRepo.create({
      id: USER_ID,
      email: "test@example.com",
      passwordHash: "hashed",
      firstName: "Test",
      lastName: "User",
    });
    const result = await tc.userRepo.findById(USER_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.firstName).toBe("Test");
    expect(result.value.role).toBe("STUDENT"); // default role
  });

  it("returns not_found for an unknown user ID", async () => {
    const tc = buildTestContainer();
    const result = await tc.userRepo.findById("does-not-exist");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });
});

describe("JoseJwtService + auth.ts contract", () => {
  it("rejects a token signed with a different secret", async () => {
    const a = new JoseJwtService("secret-a-at-least-32-bytes-padding-ok");
    const b = new JoseJwtService("secret-b-at-least-32-bytes-padding-ok");
    const signed = await a.sign({ sub: USER_ID }, "7d");
    if (!signed.ok) throw new Error("sign failed");
    const result = await b.verify(signed.value);
    expect(result.ok).toBe(false);
  });

  it("rejects an expired token", async () => {
    const jwt = new JoseJwtService(SECRET);
    const signed = await jwt.sign({ sub: USER_ID }, "-1s");
    if (!signed.ok) throw new Error("sign failed");
    const result = await jwt.verify(signed.value);
    expect(result.ok).toBe(false);
  });

  it("verifies a token whose payload includes a role claim", async () => {
    // Mirrors what SignIn (STORY-006) will do: embed the user's role
    // in the JWT so requireAdmin can short-circuit without a DB hit.
    const jwt = new JoseJwtService(SECRET);
    const signed = await jwt.sign(
      { sub: USER_ID, role: "ADMIN", sessionId: "s-1" },
      "7d",
    );
    if (!signed.ok) throw new Error("sign failed");
    const result = await jwt.verify(signed.value);
    if (!result.ok) throw new Error("verify failed");
    expect(result.value.role).toBe("ADMIN");
    expect(result.value.sessionId).toBe("s-1");
  });
});
