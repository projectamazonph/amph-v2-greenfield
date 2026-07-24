/**
 * signup.action.test.ts - coverage for the signup action.
 *
 * STORY-046 fix: performSignUp does NOT call navigate() / redirect()
 * internally. It returns { kind: "success", email, redirectTo: "/dashboard" }.
 * The page handles client-side navigation via router.push() inside useEffect.
 * This avoids the NEXT_REDIRECT / React 19 useActionState conflict that
 * caused a client-side crash.
 */

import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

import { performSignUp } from "../signup.action";
import { buildTestContainer } from "@/composition/container.test";

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

function freshContainer() {
  return buildTestContainer();
}

describe("performSignUp", () => {
  it("returns invalid_input when email is missing", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performSignUp(
      container,
      { email: "", password: "validPassword123", firstName: "Test", lastName: "User" },
      deps,
    );
    expect(result.kind).toBe("invalid_input");
    expect(deps.plantCookie).not.toHaveBeenCalled();
  });

  it("returns invalid_input when password is missing", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performSignUp(
      container,
      { email: "u@test.example.com", password: "", firstName: "Test", lastName: "User" },
      deps,
    );
    expect(result.kind).toBe("invalid_input");
  });

  it("returns invalid_input when firstName is missing", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performSignUp(
      container,
      {
        email: "u@test.example.com",
        password: "validPassword123",
        firstName: "",
        lastName: "User",
      },
      deps,
    );
    expect(result.kind).toBe("invalid_input");
  });

  it("returns invalid_input when lastName is missing", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performSignUp(
      container,
      {
        email: "u@test.example.com",
        password: "validPassword123",
        firstName: "Test",
        lastName: "",
      },
      deps,
    );
    expect(result.kind).toBe("invalid_input");
  });

  it("returns email_taken when the email is already registered", async () => {
    const container = freshContainer();
    await container.userRepo.create({
      id: "existing-u",
      email: "u@test.example.com",
      passwordHash: "already-hashed",
      firstName: "Existing",
      lastName: "User",
    });
    const deps = makeDeps();
    const result = await performSignUp(
      container,
      {
        email: "u@test.example.com",
        password: "validPassword123",
        firstName: "Test",
        lastName: "User",
      },
      deps,
    );
    expect(result).toMatchObject({ kind: "email_taken" });
    expect(deps.plantCookie).not.toHaveBeenCalled();
  });

  it("uses the documented 10-per-hour IP bucket and returns rate_limited when denied", async () => {
    const container = freshContainer();
    const check = vi.spyOn(container.rateLimiter, "check").mockResolvedValue({
      ok: true,
      value: { allowed: false, remaining: 0, resetSeconds: 600 },
    });
    const deps = makeDeps({ getClientIp: vi.fn(async () => "203.0.113.20") });
    const result = await performSignUp(
      container,
      {
        email: "rate-limited@test.example.com",
        password: "validPassword123",
        firstName: "Rate",
        lastName: "Limited",
      },
      deps,
    );
    expect(result).toEqual({ kind: "rate_limited", retryAfterSeconds: 600 });
    expect(check).toHaveBeenCalledWith({
      key: "signup:ip:203.0.113.20",
      limit: 10,
      windowSeconds: 3600,
    });
  });

  it("skips the IP bucket when the request has no trusted client IP", async () => {
    const container = freshContainer();
    await container.userRepo.create({
      id: "existing-without-ip",
      email: "without-ip@test.example.com",
      passwordHash: "already-hashed",
      firstName: "Existing",
      lastName: "User",
    });
    const check = vi.spyOn(container.rateLimiter, "check");
    const deps = makeDeps({ getClientIp: vi.fn(async () => undefined) });
    const result = await performSignUp(
      container,
      {
        email: "without-ip@test.example.com",
        password: "validPassword123",
        firstName: "No",
        lastName: "Ip",
      },
      deps,
    );
    expect(result).toMatchObject({ kind: "email_taken" });
    expect(check).not.toHaveBeenCalled();
  });

  it("creates the user, auto-logs-in, plants cookie, and returns redirectTo on success", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performSignUp(
      container,
      {
        email: "new@test.example.com",
        password: "validPassword123",
        firstName: "New",
        lastName: "User",
      },
      deps,
    );
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.email).toBe("new@test.example.com");
      expect(result.redirectTo).toBe("/dashboard");
    }
    const found = await container.userRepo.findByEmail("new@test.example.com");
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.value.firstName).toBe("New");
      expect(found.value.lastName).toBe("User");
    }
    expect(deps.plantCookie).toHaveBeenCalledTimes(1);
    const plantCall = deps.plantCookie.mock.calls[0];
    expect(plantCall).toBeDefined();
    expect(plantCall![0]).toMatch(/^eyJ/);
    expect(plantCall![1]).toBeInstanceOf(Date);
  });

  it("uses container.passwordHasher (no inline Argon2PasswordHasher instantiation)", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const hashSpy = vi.spyOn(container.passwordHasher, "hash");
    const result = await performSignUp(
      container,
      {
        email: "spy@test.example.com",
        password: "validPassword123",
        firstName: "Spy",
        lastName: "User",
      },
      deps,
    );
    expect(result.kind).toBe("success");
    expect(hashSpy).toHaveBeenCalledWith("validPassword123");
  });

  it("gracefully degrades if auto-login fails (signup still returns success without redirectTo)", async () => {
    const container = freshContainer();
    const failingDeps = makeDeps({
      plantCookie: vi.fn(async () => {
        throw new Error("Cookie set failed");
      }),
    });
    const result = await performSignUp(
      container,
      {
        email: "degrade@test.example.com",
        password: "validPassword123",
        firstName: "Degrade",
        lastName: "User",
      },
      failingDeps,
    );
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.email).toBe("degrade@test.example.com");
      expect(result.redirectTo).toBeUndefined();
    }
    expect(failingDeps.plantCookie).toHaveBeenCalledTimes(1);
  });

  it("returns unexpected error if the use case throws", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const realCreate = container.userRepo.create.bind(container.userRepo);
    container.userRepo.create = vi.fn(async () => {
      return { ok: false, error: { kind: "db_error", message: "simulated DB failure" } };
    }) as typeof realCreate;
    void realCreate;
    const result = await performSignUp(
      container,
      {
        email: "boom@test.example.com",
        password: "validPassword123",
        firstName: "Boom",
        lastName: "User",
      },
      deps,
    );
    expect(result).toMatchObject({ kind: "db_error" });
    expect(deps.plantCookie).not.toHaveBeenCalled();
  });
});
