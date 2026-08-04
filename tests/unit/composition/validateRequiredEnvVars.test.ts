/**
 * validateRequiredEnvVars — src/composition/container.ts.
 *
 * Covers the fail-closed BLOB_READ_WRITE_TOKEN check added in review
 * (STORY-098.5 follow-up): production without a blob store provisioned
 * used to silently fall back to LocalFileStorage, which does not persist
 * on Vercel's serverless filesystem. Kept separate from
 * `container.test.ts` (not a Vitest spec — see its own docblock) and
 * from `tests/unit/composition/container.test.ts` (covers the test
 * container's wiring, not env-var validation).
 *
 * `process.env.NODE_ENV` is a read-only property in this TS config, so
 * `vi.stubEnv`/`vi.unstubAllEnvs` are used instead of direct assignment.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { validateRequiredEnvVars } from "@/composition/container";

describe("validateRequiredEnvVars", () => {
  beforeEach(() => {
    vi.stubEnv("PAYMONGO_SECRET", "sk_test_x");
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("JWT_SECRET", "test-secret-at-least-32-bytes-long-please");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/amph_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw when every required var is set and NODE_ENV is not production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", undefined);
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it("does not throw in production when BLOB_READ_WRITE_TOKEN is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_x");
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it("throws in production when BLOB_READ_WRITE_TOKEN is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", undefined);
    expect(() => validateRequiredEnvVars()).toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it("does not require BLOB_READ_WRITE_TOKEN outside production (dev keeps using LocalFileStorage)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", undefined);
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it("still throws on the pre-existing required vars regardless of BLOB_READ_WRITE_TOKEN", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => validateRequiredEnvVars()).toThrow(/DATABASE_URL/);
  });
});
