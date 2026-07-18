/**
 * auth.guards.test.ts — TDD for the page-level guard functions in
 * src/lib/auth.ts: getSessionUserId, getSessionUser, requireAuth,
 * requireAdmin.
 *
 * These functions are the only sanctioned entry point for server
 * components to read the current session. They are all tested here
 * with mocked next/headers and next/navigation so we can assert
 * their behavior without a real Next runtime.
 *
 * What we test:
 *
 * getSessionUserId:
 * - returns the user id from a valid JWT cookie
 * - returns null when the cookie is missing
 * - returns null when the JWT verify fails (bad signature, expired)
 * - returns null when the JWT has no sub claim
 *
 * getSessionUser:
 * - returns the User when session is valid + user exists
 * - returns null when session is invalid
 * - returns null when session is valid but user no longer exists
 *   (account was deleted while JWT was still in flight)
 *
 * requireAuth:
 * - returns the User when session is valid
 * - redirects to /login when session is missing
 * - redirects to /login?redirect=<current> when currentPath is given
 *
 * requireAdmin:
 * - returns the User when session is valid and role is ADMIN
 * - redirects to /login when session is missing
 * - redirects to /dashboard?error=forbidden when role is not ADMIN
 *
 * TDD discipline: this test file is written first. The existing
 * auth.test.ts covers the JWT/user-lookup integration; this file
 * covers the guard functions' behavior.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ── Mocks for the Next runtime + container ───────────────────

// server-only: throw if imported
vi.mock("server-only", () => ({}));

// next/headers: a mutable Map of cookies that the test can set.
const cookieJar: Map<string, string> = new Map();
const mockGet = vi.fn((name: string) => {
  const value = cookieJar.get(name);
  return value ? { value } : undefined;
});
const mockSet = vi.fn((opts: { name: string; value: string; expires?: Date; maxAge?: number; [k: string]: unknown }) => {
  cookieJar.set(opts.name, opts.value);
});
const mockDelete = vi.fn((name: string) => {
  cookieJar.delete(name);
});
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: mockGet,
      set: mockSet,
      delete: mockDelete,
    }),
}));

// next/navigation: track redirect() calls.
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// Container: replace with a fresh test container per test.
let testContainer: ReturnType<typeof import("@/composition/container.test").buildTestContainer>;
vi.mock("@/composition/container", () => ({
  buildContainer: () => testContainer,
}));

import { getSessionUserId, getSessionUser, requireAuth, requireAdmin } from "@/lib/auth";
import { buildTestContainer } from "@/composition/container.test";

const SESSION_COOKIE = "amph_session";

// ── Setup helpers ───────────────────────────────────────────

async function seedUser(opts: {
  id?: string;
  role?: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  email?: string;
} = {}) {
  const id = opts.id ?? "u-1";
  await testContainer.userRepo.create({
    id,
    email: opts.email ?? `${id}@test.example.com`,
    passwordHash: "placeholder-hash",
    firstName: "Test",
    lastName: "User",
  });
  // The InMemoryUserRepository.create hardcodes role=STUDENT (per the
  // signup default). For tests that need ADMIN/INSTRUCTOR, swap the
  // stored user. This is a test-only escape hatch; the production
  // role assignment happens via the SignUp use case (or admin tools
  // — future story).
  if (opts.role && opts.role !== "STUDENT") {
    const repo = testContainer.userRepo as unknown as {
      users: Map<string, unknown>;
    };
    const existing = repo.users.get(id) as Record<string, unknown> | undefined;
    if (existing) {
      repo.users.set(id, { ...existing, role: opts.role });
    }
  }
  return id;
}

async function seedSessionCookie(userId: string, role: "STUDENT" | "ADMIN" = "STUDENT", sessionId = "s-1") {
  const sign = await testContainer.jwt.sign(
    { sub: userId, role, sessionId },
    "1h",
  );
  if (!sign.ok) throw new Error("sign failed");
  cookieJar.set(SESSION_COOKIE, sign.value);
  return sign.value;
}

beforeEach(() => {
  cookieJar.clear();
  mockGet.mockClear();
  mockSet.mockClear();
  mockDelete.mockClear();
  mockRedirect.mockClear();
  testContainer = buildTestContainer();
});

// ── Tests ───────────────────────────────────────────────────

describe("getSessionUserId", () => {
  it("returns the user id from a valid JWT cookie", async () => {
    await seedSessionCookie("u-42", "STUDENT");
    expect(await getSessionUserId()).toBe("u-42");
  });

  it("returns null when the cookie is missing", async () => {
    expect(await getSessionUserId()).toBe(null);
  });

  it("returns null when the JWT verify fails (bad signature)", async () => {
    cookieJar.set(SESSION_COOKIE, "not.a.valid.jwt");
    expect(await getSessionUserId()).toBe(null);
  });

  it("returns null when the JWT has no sub claim", async () => {
    const sign = await testContainer.jwt.sign({ role: "STUDENT" }, "1h");
    if (!sign.ok) throw new Error("sign failed");
    cookieJar.set(SESSION_COOKIE, sign.value);
    expect(await getSessionUserId()).toBe(null);
  });

  it("returns null when the sub claim is an empty string", async () => {
    const sign = await testContainer.jwt.sign({ sub: "" }, "1h");
    if (!sign.ok) throw new Error("sign failed");
    cookieJar.set(SESSION_COOKIE, sign.value);
    expect(await getSessionUserId()).toBe(null);
  });
});

describe("getSessionUser", () => {
  it("returns the User when session is valid and user exists", async () => {
    await seedUser({ id: "u-1", role: "ADMIN", email: "admin@test.example.com" });
    await seedSessionCookie("u-1", "ADMIN");
    const user = await getSessionUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe("u-1");
    expect(user?.role).toBe("ADMIN");
    expect(user?.email).toBe("admin@test.example.com");
  });

  it("returns null when the session is invalid", async () => {
    await seedUser({ id: "u-1" });
    // No cookie seeded
    expect(await getSessionUser()).toBe(null);
  });

  it("returns null when the session is valid but the user no longer exists", async () => {
    // Mint a JWT for a userId that we'll never persist
    await seedSessionCookie("ghost-user", "STUDENT");
    expect(await getSessionUser()).toBe(null);
  });
});

describe("requireAuth", () => {
  it("returns the User when the session is valid", async () => {
    await seedUser({ id: "u-1", email: "u1@test.example.com" });
    await seedSessionCookie("u-1");
    const user = await requireAuth();
    expect(user.id).toBe("u-1");
  });

  it("redirects to /login when the session is missing", async () => {
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login?redirect=<path> when currentPath is given", async () => {
    await expect(requireAuth("/courses/the-ppc-mastery/lessons/l-1")).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?redirect=" + encodeURIComponent("/courses/the-ppc-mastery/lessons/l-1"),
    );
  });
});

describe("requireAdmin", () => {
  it("returns the User when the session is valid and the role is ADMIN", async () => {
    await seedUser({ id: "u-admin", role: "ADMIN", email: "admin@test.example.com" });
    await seedSessionCookie("u-admin", "ADMIN");
    const user = await requireAdmin();
    expect(user.id).toBe("u-admin");
    expect(user.role).toBe("ADMIN");
  });

  it("redirects to /login when the session is missing", async () => {
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /dashboard?error=forbidden when the role is not ADMIN", async () => {
    await seedUser({ id: "u-student", role: "STUDENT", email: "s@test.example.com" });
    await seedSessionCookie("u-student", "STUDENT");
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /dashboard?error=forbidden");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard?error=forbidden");
  });

  it("uses currentPath for the login redirect (preserves admin deep-links)", async () => {
    await expect(requireAdmin("/admin/users/u-1")).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?redirect=" + encodeURIComponent("/admin/users/u-1"),
    );
  });
});

// Suppress unused warnings for the type imports at the top
void (null as unknown as Mock);
