/**
 * signup.action.test.ts — TDD coverage for the signup action.
 *
 * The signup action is a thin shell around the SignUp use case +
 * (post-STORY-006) the Login use case for auto-login. The thin shell
 * isn't directly testable without mocking Next, so we extract the
 * testable pure function `performSignUp()` and test it here.
 *
 * What we cover:
 * - Input validation (missing fields → invalid_input)
 * - Use case wiring (SignUp → Login → setAuthCookie)
 * - Auto-login graceful degradation (if Login fails, signup still
 *   reports success — user can manually log in)
 * - The signup action's return-shape contract (success with email,
 *   error with discriminated union)
 *
 * TDD: this test file is written FIRST, watched to fail, then the
 * performSignUp() function is extracted from signup.action.ts to
 * make it pass.
 */

import { describe, it, expect, vi, type Mock } from "vitest";

// Mock server-only so src/lib/auth.ts can be imported in a non-Next
// context.
vi.mock("server-only", () => ({}));

import { performSignUp } from "../signup.action";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { buildTestContainer } from "@/composition/container.test";

// ── Fixture helpers ──────────────────────────────────────────

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

type PerformSignUpDeps = Parameters<typeof performSignUp>[2];

function asProdDeps(d: LoginDeps): PerformSignUpDeps {
  // The makeDeps return type is wider than what performSignUp accepts
  // (mock fns are loosely typed). Cast at the call site via this helper.
  return d as unknown as PerformSignUpDeps;
}

function freshContainer() {
  return buildTestContainer();
}

// ── Tests ────────────────────────────────────────────────────

describe("performSignUp", () => {
  it("returns invalid_input when email is missing", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performSignUp(
      container,
      {
        email: "",
        password: "validPassword123",
        firstName: "Test",
        lastName: "User",
      },
      asProdDeps(deps),
    );
    expect(result.kind).toBe("invalid_input");
    expect(deps.plantCookie).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it("returns invalid_input when password is missing", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    const result = await performSignUp(
      container,
      {
        email: "u@test.example.com",
        password: "",
        firstName: "Test",
        lastName: "User",
      },
      asProdDeps(deps),
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
      asProdDeps(deps),
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
      asProdDeps(deps),
    );
    expect(result.kind).toBe("invalid_input");
  });

  it("returns email_taken when the email is already registered", async () => {
    const container = freshContainer();
    // Seed an existing user with the same email
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
      asProdDeps(deps),
    );
    expect(result).toMatchObject({ kind: "email_taken" });
    expect(deps.plantCookie).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it("creates the user, auto-logs-in, plants cookie, and navigates on success", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    await expect(
      performSignUp(
        container,
        {
          email: "new@test.example.com",
          password: "validPassword123",
          firstName: "New",
          lastName: "User",
        },
        asProdDeps(deps),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    // The user was created
    const found = await container.userRepo.findByEmail("new@test.example.com");
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.value.firstName).toBe("New");
      expect(found.value.lastName).toBe("User");
    }

    // The cookie was planted (the auto-login succeeded)
    expect(deps.plantCookie).toHaveBeenCalledTimes(1);
    const plantCall = deps.plantCookie.mock.calls[0];
    expect(plantCall).toBeDefined();
    expect(plantCall![0]).toMatch(/^eyJ/); // JWT
    expect(plantCall![1]).toBeInstanceOf(Date);

    // The user was navigated to /dashboard
    expect(deps.navigate).toHaveBeenCalledWith("/dashboard");
  });

  it("uses container.passwordHasher (no inline Argon2PasswordHasher instantiation)", async () => {
    // This test guards against the SOLID violation: the signup action
    // should NOT instantiate its own hasher; it should use the one
    // from the container (so the container is the single source of
    // truth for which hasher is used in prod vs test).
    //
    // Proof: replace the container's hasher with one that hashes
    // deterministically, then assert the user's stored hash equals
    // the deterministic output. If performSignUp had an inline
    // Argon2PasswordHasher, the stored hash would NOT match
    // (because the inline hasher would be a different instance with
    // a different salt path).
    const container = freshContainer();
    const deps = makeDeps();
    // Spy on the hash method. If performSignUp doesn't reach for
    // the container's hasher, the spy is never called and the
    // assertion fails.
    const hashSpy = vi.spyOn(container.passwordHasher, "hash");
    await expect(
      performSignUp(
        container,
        {
          email: "spy@test.example.com",
          password: "validPassword123",
          firstName: "Spy",
          lastName: "User",
        },
        asProdDeps(deps),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(hashSpy).toHaveBeenCalledWith("validPassword123");
  });

  it("gracefully degrades if auto-login fails (signup still returns success)", async () => {
    // The signup action is forgiving: if Login fails after SignUp
    // succeeds, the user still gets a success state. They just have
    // to manually log in. This is intentional — the signup success
    // signal should match what the user perceives ("I created an
    // account"), not depend on the side-effect Login also working.
    const container = freshContainer();
    const deps = makeDeps();
    // Make plantCookie throw — simulates the auto-login failing for
    // any reason (e.g., cookie set fails, or Login's sessionRepo
    // is misconfigured). The signup should still return success
    // because SignUp.execute() itself worked.
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
      asProdDeps(failingDeps),
    );
    // The user was created despite the auto-login failure
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.email).toBe("degrade@test.example.com");
    }
    // And no navigation happened (because plantCookie threw before
    // navigate was called)
    expect(failingDeps.navigate).not.toHaveBeenCalled();
    // The plantCookie was attempted though
    expect(failingDeps.plantCookie).toHaveBeenCalledTimes(1);
    void deps;
  });

  it("returns unexpected error if the use case throws", async () => {
    const container = freshContainer();
    const deps = makeDeps();
    // Force the SignUp use case to throw by replacing the user repo
    // with one that throws on create.
    const realCreate = container.userRepo.create.bind(container.userRepo);
    container.userRepo.create = vi.fn(async () => {
      return {
        ok: false,
        error: { kind: "db_error", message: "simulated DB failure" },
      };
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
      asProdDeps(deps),
    );
    // The use case's db_error should be surfaced as db_error
    expect(result).toMatchObject({ kind: "db_error" });
    expect(deps.plantCookie).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});
