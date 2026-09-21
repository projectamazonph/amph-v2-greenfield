import { describe, it, expect, beforeEach } from "vitest";
import { CompleteWelcome } from "../CompleteWelcome";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { FixedClock } from "@/ports/system/Clock";
import { Result } from "@/domain/shared/Result";

describe("CompleteWelcome", () => {
  let repo: InMemoryUserRepository;
  let clock: FixedClock;
  let useCase: CompleteWelcome;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    clock = new FixedClock(new Date("2026-09-20T12:00:00Z"));
    useCase = new CompleteWelcome(repo, clock);
  });

  it("stamps the welcome timestamp on a fresh user", async () => {
    const created = await repo.create({
      id: "u1",
      email: "a@b.co",
      passwordHash: "x",
      firstName: "A",
      lastName: "B",
    });
    expect(created.ok).toBe(true);

    const result = await useCase.execute({ userId: "u1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.completedAt).toEqual(clock.now());
  });

  it("is idempotent — re-running returns the original timestamp", async () => {
    await repo.create({
      id: "u1",
      email: "a@b.co",
      passwordHash: "x",
      firstName: "A",
      lastName: "B",
    });
    await useCase.execute({ userId: "u1" });

    clock.set(new Date("2026-12-31T00:00:00Z"));
    const result = await useCase.execute({ userId: "u1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.completedAt).toEqual(new Date("2026-09-20T12:00:00Z"));
  });

  it("returns not_found for unknown user", async () => {
    const result = await useCase.execute({ userId: "missing" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });
});
