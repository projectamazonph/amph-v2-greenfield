/**
 * InMemoryUserRepository.welcome.test.ts — STORY-129.
 *
 * Scoped to the welcome-completion surface added to InMemoryUserRepository
 * (markWelcomeCompleted, resetWelcome). Mirrors the per-method test-file
 * split established by InMemoryUserRepository.anonymizeAndDelete.test.ts
 * and PrismaUserRepository.{twoFactor,lockout}.test.ts.
 */
import { describe, it, expect } from "vitest";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";

describe("InMemoryUserRepository.welcome", () => {
  it("markWelcomeCompleted sets the timestamp", async () => {
    const repo = new InMemoryUserRepository();
    const created = await repo.create({
      id: "u1",
      email: "a@b.co",
      passwordHash: "x",
      firstName: "A",
      lastName: "B",
    });
    // created.ok === true
    const result = await repo.markWelcomeCompleted("u1", new Date("2026-09-20T00:00:00Z"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.welcomeCompletedAt).toEqual(new Date("2026-09-20T00:00:00Z"));
    }
  });

  it("markWelcomeCompleted is idempotent", async () => {
    const repo = new InMemoryUserRepository();
    await repo.create({
      id: "u1",
      email: "a@b.co",
      passwordHash: "x",
      firstName: "A",
      lastName: "B",
    });
    await repo.markWelcomeCompleted("u1", new Date("2026-09-20T00:00:00Z"));
    const result = await repo.markWelcomeCompleted("u1", new Date("2026-12-31T00:00:00Z"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.welcomeCompletedAt).toEqual(new Date("2026-09-20T00:00:00Z"));
    }
  });

  it("resetWelcome clears the timestamp", async () => {
    const repo = new InMemoryUserRepository();
    await repo.create({
      id: "u1",
      email: "a@b.co",
      passwordHash: "x",
      firstName: "A",
      lastName: "B",
    });
    await repo.markWelcomeCompleted("u1", new Date("2026-09-20T00:00:00Z"));
    const result = await repo.resetWelcome("u1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.welcomeCompletedAt).toBeNull();
    }
  });

  it("returns not_found for unknown user", async () => {
    const repo = new InMemoryUserRepository();
    const result = await repo.markWelcomeCompleted("missing", new Date());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});
