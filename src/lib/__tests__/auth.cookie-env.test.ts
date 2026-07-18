/**
 * auth.cookie-env.test.ts — TDD for the SESSION_COOKIE env flavor
 * in src/lib/auth.ts.
 *
 * The cookie name is environment-dependent:
 *  - In production:  "__Secure-amph_session"  (Secure cookie, requires HTTPS)
 *  - In development: "amph_session"           (works on http://localhost)
 *
 * The previous implementation captured the env at MODULE LOAD time:
 *   const SESSION_COOKIE = process.env.NODE_ENV === "production" ? ... : ...;
 * This meant that if NODE_ENV changed after the module was first
 * imported, the cookie name wouldn't update. This was a real bug
 * in tests (which sometimes set NODE_ENV=production partway through)
 * and would have been a bug in any hot-reload scenario.
 *
 * The fix: read NODE_ENV at call time, not at module-load time.
 *
 * What we test:
 *  - The dev flavor is used when NODE_ENV !== "production"
 *  - The prod flavor is used when NODE_ENV === "production"
 *  - Flipping NODE_ENV after import takes effect on the next call
 *  - The SESSION_COOKIE constant (if exposed) is the dev flavor by
 *    default (kept for backwards compat with _testInternals)
 *
 * TDD: this test file is written first. Watch it fail (because
 * the current implementation captures at module load), then fix
 * the implementation to make it pass.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

const cookieJar: Map<string, string> = new Map();
const mockGet = vi.fn((name: string) => {
  const value = cookieJar.get(name);
  return value ? { value } : undefined;
});
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: mockGet,
      set: vi.fn(),
      delete: vi.fn(),
    }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));

let testContainer: ReturnType<typeof import("@/composition/container.test").buildTestContainer>;
vi.mock("@/composition/container", () => ({
  buildContainer: () => testContainer,
}));

import { getSessionUserId } from "@/lib/auth";
import { buildTestContainer } from "@/composition/container.test";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  cookieJar.clear();
  mockGet.mockClear();
  testContainer = buildTestContainer();
});

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
});

/**
 * NODE_ENV is typed as readonly in @types/node, but we need to flip
 * it for these tests. Cast through `unknown` to bypass the type check
 * at the test boundary (the actual runtime mutation is fine).
 */
function setNodeEnv(value: string | undefined): void {
  Object.assign(process.env, { NODE_ENV: value });
}

// ── Tests ───────────────────────────────────────────────────

describe("SESSION_COOKIE env flavor (call-time, not module-load-time)", () => {
  it("uses the dev cookie name when NODE_ENV !== production", async () => {
    setNodeEnv("development");
    cookieJar.set("amph_session", await signTestToken("u-dev"));
    expect(await getSessionUserId()).toBe("u-dev");
  });

  it("uses the prod cookie name when NODE_ENV === production", async () => {
    setNodeEnv("production");
    cookieJar.set("__Secure-amph_session", await signTestToken("u-prod"));
    expect(await getSessionUserId()).toBe("u-prod");
  });

  it("flips cookie name when NODE_ENV changes after import", async () => {
    // Critical regression test: the old module-load-time capture
    // would lock the cookie name on first import. After the fix,
    // the cookie name reflects the CURRENT NODE_ENV.
    setNodeEnv("development");
    cookieJar.set("amph_session", await signTestToken("u-dev"));

    const resultDev = await getSessionUserId();
    expect(resultDev).toBe("u-dev");

    // Switch to production — the next call should read the prod cookie.
    setNodeEnv("production");
    cookieJar.delete("amph_session");
    cookieJar.set("__Secure-amph_session", await signTestToken("u-prod"));

    const resultProd = await getSessionUserId();
    expect(resultProd).toBe("u-prod");
  });

  it("defaults to dev cookie name when NODE_ENV is unset", async () => {
    setNodeEnv(undefined);
    cookieJar.set("amph_session", await signTestToken("u-unset"));
    expect(await getSessionUserId()).toBe("u-unset");
  });

  it("falls back gracefully: returns null when the current-env cookie is missing", async () => {
    setNodeEnv("production");
    // Only the dev cookie is set; the prod cookie is missing
    cookieJar.set("amph_session", await signTestToken("u-dev"));
    expect(await getSessionUserId()).toBe(null);
  });
});

// ── Helpers ─────────────────────────────────────────────────

async function signTestToken(userId: string): Promise<string> {
  const sign = await testContainer.jwt.sign(
    { sub: userId, role: "STUDENT" },
    "1h",
  );
  if (!sign.ok) throw new Error("sign failed");
  return sign.value;
}

// Suppress unused-import warning
void vi;
