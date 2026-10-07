import { describe, it, expect, beforeEach } from "vitest";
import { ResetWelcome } from "../ResetWelcome";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { CompleteWelcome } from "../CompleteWelcome";
import { FixedClock } from "@/ports/system/Clock";

describe("ResetWelcome", () => {
  let repo: InMemoryUserRepository;
  let clock: FixedClock;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    clock = new FixedClock(new Date("2026-09-20T12:00:00Z"));
  });

  it("clears the welcome timestamp after completion", async () => {
    const created = await repo.create({
      id: "u1",
      email: "a@b.co",
      passwordHash: "x",
      firstName: "A",
      lastName: "B",
    });
    expect(created.ok).toBe(true);
    await new CompleteWelcome(repo, clock).execute({ userId: "u1" });

    const useCase = new ResetWelcome(repo);
    const result = await useCase.execute({ userId: "u1" });
    expect(result.ok).toBe(true);

    const found = await repo.findById("u1");
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.value.welcomeCompletedAt).toBeNull();
  });

  it("is a no-op when the user never completed welcome", async () => {
    const created = await repo.create({
      id: "u1",
      email: "a@b.co",
      passwordHash: "x",
      firstName: "A",
      lastName: "B",
    });
    expect(created.ok).toBe(true);

    const useCase = new ResetWelcome(repo);
    const result = await useCase.execute({ userId: "u1" });
    expect(result.ok).toBe(true);

    const found = await repo.findById("u1");
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.value.welcomeCompletedAt).toBeNull();
  });

  it("returns not_found for unknown user", async () => {
    const useCase = new ResetWelcome(repo);
    const result = await useCase.execute({ userId: "missing" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});
