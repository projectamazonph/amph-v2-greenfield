/**
 * login.action.test.ts — STORY-006.
 *
 * Tests the pure performLogin helper extracted from loginAndRedirect.
 *
 * The helper takes a `container.login` and two side-effect functions
 * (`plantCookie`, `navigate`) as deps, so it can be tested without
 * mocking next/headers or next/navigation. The thin `loginAndRedirect`
 * action wrapper that calls this helper is itself untested in
 * isolation — it's three lines of glue and would require mocking
 * the whole Next runtime, which adds little value over testing
 * performLogin + the Login use case (which has 13+ tests of its own).
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock server-only so src/lib/auth.ts can be imported.
vi.mock("server-only", () => ({}));

import { performLogin } from "../login.action";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { buildTestContainer } from "@/composition/container.test";

// ── Fixture helpers ──────────────────────────────────────────

let testContainerRef: ReturnType<typeof buildTestContainer> | null = null;

function freshContainer() {
  // buildTestContainer() always returns a fresh in-memory container.
  testContainerRef = buildTestContainer();
  return testContainerRef;
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
type MockNavigate = Mock<(url: string) => never>;

function makeDeps(overrides: {
  plantCookie?: MockPlantCookie;
  navigate?: MockNavigate;
} = {}): {
  plantCookie: MockPlantCookie;
  navigate: MockNavigate;
} {
  const plantCookie = overrides.plantCookie ?? vi.fn(async () => undefined);
  const navigate =
    overrides.navigate ??
    vi.fn((_url: string): never => {
      throw new Error("NEXT_REDIRECT");
    });
  return { plantCookie, navigate };
}

type LoginDeps = ReturnType<typeof makeDeps>;

// The makeDeps return type is wider than what performLogin accepts
// (mock fns are loosely typed). Cast at the call site via this helper.
function asProdDeps(d: LoginDeps): Parameters<typeof performLogin>[2] {
  return d as unknown as Parameters<typeof performLogin>[2];
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
      asProdDeps(deps),
    );
    expect(result).toEqual({ kind: "invalid_input" });
    expect(deps.plantCookie).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
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

  it("plants the cookie and navigates on success", async () => {
    const container = freshContainer();
    await seedUser(container, "u@test.example.com", "correct-password");
    const deps = makeDeps();
    await expect(
      performLogin(
        container,
        {
          email: "u@test.example.com",
          password: "correct-password",
          redirectTo: "/admin/users",
        },
        deps,
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(deps.plantCookie).toHaveBeenCalledTimes(1);
    const plantCall = deps.plantCookie.mock.calls[0];
    expect(plantCall).toBeDefined();
    expect(plantCall![0]).toMatch(/^eyJ/); // JWT
    expect(plantCall![1]).toBeInstanceOf(Date);
    expect(deps.navigate).toHaveBeenCalledWith("/admin/users");
  });

  it("rejects open redirects and falls back to /courses", async () => {
    const container = freshContainer();
    await seedUser(container, "u@test.example.com", "correct-password");
    const navigate = vi.fn((_url: string): never => {
      throw new Error("NEXT_REDIRECT");
    });
    await expect(
      performLogin(
        container,
        {
          email: "u@test.example.com",
          password: "correct-password",
          redirectTo: "https://evil.example.com/steal",
        },
        { plantCookie: vi.fn(), navigate },
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(navigate).toHaveBeenCalledWith("/courses");
  });

  it("rejects //evil.com protocol-relative URLs", async () => {
    const container = freshContainer();
    await seedUser(container, "u@test.example.com", "correct-password");
    const navigate = vi.fn((_url: string): never => {
      throw new Error("NEXT_REDIRECT");
    });
    await expect(
      performLogin(
        container,
        {
          email: "u@test.example.com",
          password: "correct-password",
          redirectTo: "//evil.example.com/steal",
        },
        { plantCookie: vi.fn(), navigate },
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    // //evil.com starts with /, so it would pass the startsWith("/")
    // check naively. The fact that we landed on /courses (not
    // //evil.com) means the open-redirect defense is working as
    // intended because Next's redirect() only accepts server-side
    // paths via this routing. We test that the navigate was called
    // with /courses.
    expect(navigate).toHaveBeenCalledWith("/courses");
  });
});
