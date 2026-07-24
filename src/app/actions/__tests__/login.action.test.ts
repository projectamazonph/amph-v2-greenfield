/**
 * login.action.test.ts — STORY-006 + STORY-066.
 *
 * Tests the pure performLogin helper extracted from loginAndRedirect.
 *
 * The helper takes a `container.login` and one side-effect function
 * (`plantCookie`) as deps, so it can be tested without mocking
 * next/headers or next/navigation. The thin `loginAndRedirect` action
 * wrapper that calls this helper is itself untested in isolation —
 * it's three lines of glue and would require mocking the whole Next
 * runtime, which adds little value over testing performLogin + the
 * Login use case (which has 13+ tests of its own).
 *
 * STORY-066 fix: the redirect is owned by the action wrapper now, not
 * by performLogin. The previous design called redirect() from a
 * callback (`deps.navigate`), which lost the Next.js request-scoped
 * AsyncLocalStorage in production builds and manifested as a 500
 * Server Components render error. performLogin now just returns
 * `{ kind: "success", redirectTo }` and the wrapper does redirect().
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock server-only so src/lib/auth.ts can be imported.
vi.mock("server-only", () => ({}));

import { performLogin } from "../login.action";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { buildTestContainer } from "@/composition/container.test";

// ── Fixture helpers ──────────────────────────────────────────

function freshContainer() {
  return buildTestContainer();
}

async function seedUser(
  container: ReturnType<typeof buildTestContainer>,
  email: string,
  password: string,
) {
  await container.userRepo.create({
    id: `u-${email}`,
    email,
    passwordHash: "",
    firstName: "Test",
    lastName: "User",
  });
  const hasher = new Argon2PasswordHasher();
  const hashResult = await hasher.hash(password);
  if (!hashResult.ok) throw new Error("hash failed");
  // InMemoryUserRepository keeps hashes in a separate map; populate it
  // directly via the test escape hatch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (container.userRepo as any).passwordHashes.set(`u-${email}`, hashResult.value);
}

type MockPlantCookie = Mock<(token: string, expiresAt: Date) => Promise<void>>;
type MockGetClientIp = Mock<() => Promise<string | undefined>>;

function makeDeps(
  overrides: {
    plantCookie?: MockPlantCookie;
    getClientIp?: MockGetClientIp;
  } = {},
): {
  plantCookie: MockPlantCookie;
  getClientIp: MockGetClientIp;
} {
  const plantCookie = overrides.plantCookie ?? vi.fn(async () => undefined);
  const getClientIp = overrides.getClientIp ?? vi.fn(async () => "127.0.0.1");
  return { plantCookie, getClientIp };
}

// ── Tests ────────────────────────────────────────────────────

describe("performLogin", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-must-be-at-least-32-bytes-long-ok";
  });

  it("returns invalid_input when email is empty", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performLogin(
      container,
      { email: "", password: "p", redirectTo: "/x" },
      deps,
    );
    expect(result).toEqual({ kind: "invalid_input" });
    expect(deps.plantCookie).not.toHaveBeenCalled();
  });

  it("returns invalid_input when password is empty", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performLogin(
      container,
      { email: "u@x", password: "", redirectTo: "/x" },
      deps,
    );
    expect(result).toEqual({ kind: "invalid_input" });
  });

  it("returns redirect_to_login with user_not_found when user does not exist", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performLogin(
      container,
      {
        email: "noone@test.example.com",
        password: "any",
        redirectTo: "/x",
      },
      deps,
    );
    expect(result).toEqual({
      kind: "redirect_to_login",
      errorKind: "user_not_found",
    });
  });

  it("returns redirect_to_login with wrong_password when password is wrong", async () => {
    const container = freshContainer();
    await seedUser(container, "u@test.example.com", "correct-password");
    const deps = makeDeps();
    const result = await performLogin(
      container,
      {
        email: "u@test.example.com",
        password: "WRONG-password",
        redirectTo: "/x",
      },
      deps,
    );
    expect(result).toEqual({
      kind: "redirect_to_login",
      errorKind: "wrong_password",
    });
  });

  it("plants the cookie and returns success with the safe redirect on success", async () => {
    const container = freshContainer();
    await seedUser(container, "u@test.example.com", "correct-password");
    const deps = makeDeps();
    const result = await performLogin(
      container,
      {
        email: "u@test.example.com",
        password: "correct-password",
        redirectTo: "/admin/users",
      },
      deps,
    );

    expect(result).toEqual({
      kind: "success",
      redirectTo: "/admin/users",
      userId: "u-u@test.example.com",
    });
    expect(deps.plantCookie).toHaveBeenCalledTimes(1);
    const plantCall = deps.plantCookie.mock.calls[0];
    expect(plantCall).toBeDefined();
    expect(plantCall![0]).toMatch(/^eyJ/); // JWT
    expect(plantCall![1]).toBeInstanceOf(Date);
  });

  it("rejects open redirects and falls back to /courses", async () => {
    const container = freshContainer();
    await seedUser(container, "u@test.example.com", "correct-password");
    const deps = makeDeps();
    const result = await performLogin(
      container,
      {
        email: "u@test.example.com",
        password: "correct-password",
        redirectTo: "https://evil.example.com/steal",
      },
      deps,
    );
    expect(result).toEqual({
      kind: "success",
      redirectTo: "/courses",
      userId: "u-u@test.example.com",
    });
  });

  it("rejects //evil.com protocol-relative URLs", async () => {
    const container = freshContainer();
    await seedUser(container, "u@test.example.com", "correct-password");
    const deps = makeDeps();
    const result = await performLogin(
      container,
      {
        email: "u@test.example.com",
        password: "correct-password",
        redirectTo: "//evil.example.com/steal",
      },
      deps,
    );
    // //evil.com starts with /, so it would pass the startsWith("/")
    // check naively. The fact that we landed on /courses (not
    // //evil.com) means the open-redirect defense is working as
    // intended because the safeRedirect check rejects anything
    // starting with `//`.
    expect(result).toEqual({
      kind: "success",
      redirectTo: "/courses",
      userId: "u-u@test.example.com",
    });
  });

  it("uses separate documented email and IP buckets before attempting login", async () => {
    const container = freshContainer();
    const check = vi.spyOn(container.rateLimiter, "check");
    const deps = makeDeps({ getClientIp: vi.fn(async () => "203.0.113.21") });

    const result = await performLogin(
      container,
      {
        email: "Student@Example.com",
        password: "any-password",
        redirectTo: "/courses",
      },
      deps,
    );

    expect(result).toEqual({ kind: "redirect_to_login", errorKind: "user_not_found" });
    expect(check).toHaveBeenNthCalledWith(1, {
      key: "login:email:student@example.com",
      limit: 5,
      windowSeconds: 900,
    });
    expect(check).toHaveBeenNthCalledWith(2, {
      key: "login:ip:203.0.113.21",
      limit: 20,
      windowSeconds: 900,
    });
  });

  it("does not create a shared IP bucket when no client IP is available", async () => {
    const container = freshContainer();
    const check = vi.spyOn(container.rateLimiter, "check");
    const deps = makeDeps({ getClientIp: vi.fn(async () => undefined) });

    const result = await performLogin(
      container,
      {
        email: "no-ip@example.com",
        password: "any-password",
        redirectTo: "/courses",
      },
      deps,
    );

    expect(result).toEqual({ kind: "redirect_to_login", errorKind: "user_not_found" });
    expect(check).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith({
      key: "login:email:no-ip@example.com",
      limit: 5,
      windowSeconds: 900,
    });
  });
});
