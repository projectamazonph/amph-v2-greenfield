import { describe, expect, it } from "vitest";
import { AwardXP } from "@/usecases/AwardXP";
import { InMemoryXPAwardRepository } from "@/infra/repositories/InMemoryXPAwardRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";

const USER_ID = "user-1";

function buildAwarder() {
  const userRepo = new InMemoryUserRepository();
  userRepo.seed([
    {
      id: USER_ID,
      email: "student@example.com",
      passwordHash: "hash",
      firstName: "Test",
      lastName: "Student",
    },
  ]);
  const xpAwardRepo = new InMemoryXPAwardRepository(userRepo);
  const awardXp = new AwardXP({
    xpAwardRepo,
    idGen: new InMemoryIdGenerator(),
    clock: new FixedClock(new Date("2026-01-01T00:00:00Z")),
  });
  return { userRepo, awardXp };
}

describe("atomic XP awards", () => {
  it("applies the same idempotency key only once", async () => {
    const { userRepo, awardXp } = buildAwarder();
    const input = {
      userId: USER_ID,
      amount: 10,
      reason: "quiz_passed",
      refId: "attempt-1",
      idempotencyKey: "quiz_passed:user-1:attempt-1",
    };

    const first = await awardXp.execute(input);
    const second = await awardXp.execute(input);
    const user = await userRepo.findById(USER_ID);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok && user.ok) {
      expect(first.value.applied).toBe(true);
      expect(second.value.applied).toBe(false);
      expect(user.value.totalXp).toBe(10);
    }
  });

  it("serializes concurrent awards and preserves both distinct increments", async () => {
    const { userRepo, awardXp } = buildAwarder();
    const [first, second] = await Promise.all([
      awardXp.execute({
        userId: USER_ID,
        amount: 10,
        reason: "quiz_passed",
        refId: "attempt-1",
        idempotencyKey: "quiz_passed:user-1:attempt-1",
      }),
      awardXp.execute({
        userId: USER_ID,
        amount: 15,
        reason: "live_class_attended",
        refId: "class-1",
        idempotencyKey: "live_class_attended:user-1:class-1",
      }),
    ]);
    const user = await userRepo.findById(USER_ID);

    expect(first.ok && second.ok).toBe(true);
    if (user.ok) expect(user.value.totalXp).toBe(25);
  });
});
