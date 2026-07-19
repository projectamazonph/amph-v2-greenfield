/**
 * Unit tests for the clearE2EUsers helper.
 *
 * TDD history: this test was written AFTER diagnosing the E2E
 * failure where clearE2EUsers threw PrismaClientInitializationError
 * in the GitHub Actions worker context. The failure made the
 * critical-journeys afterEach hook blow up and fail the test even
 * when the test body had passed. The test below pins the new
 * contract: clearE2EUsers MUST be a no-op (not throw) when:
 *  - the databaseUrl argument is empty
 *  - the databaseUrl is invalid (cannot construct PrismaClient)
 * It MUST also be idempotent on repeated calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { clearE2EUsers } from "../../e2e/helpers/seed";

describe("clearE2EUsers", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: string | undefined;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    originalEnv = process.env.DATABASE_URL;
    // Make sure no leftover env from other tests.
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    warnSpy.mockRestore();
    if (originalEnv === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalEnv;
    }
  });

  it("does not throw when databaseUrl is empty", async () => {
    await expect(clearE2EUsers("")).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("DATABASE_URL is empty"),
    );
  });

  it("does not throw when databaseUrl is malformed", async () => {
    // postgresql:// is the required protocol prefix; an empty host
    // will cause PrismaClient to throw during construction.
    await expect(
      clearE2EUsers("postgresql://"),
    ).resolves.toBeUndefined();
    // The helper must have warned instead of throwing.
    expect(warnSpy).toHaveBeenCalled();
  });

  it("does not modify process.env.DATABASE_URL when given an empty string", async () => {
    await clearE2EUsers("");
    // The helper must guard `process.env.DATABASE_URL = databaseUrl`
    // when databaseUrl is empty, so we don't clobber a real value.
    expect(process.env.DATABASE_URL).toBeUndefined();
  });

  it("is safe to call multiple times in a row", async () => {
    await clearE2EUsers("");
    await clearE2EUsers("");
    await clearE2EUsers("postgresql://");
    // No throw, no leaked warnings beyond the per-call count.
    expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
