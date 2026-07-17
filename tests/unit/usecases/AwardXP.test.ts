import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { AwardXP } from "@/usecases/AwardXP";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { IUserRepository } from "@/ports/repositories/IUserRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { XPEvent } from "@/domain/entities/XPEvent";
import type { User } from "@/domain/entities/User";

const USER_ID = "user_01";
const NOW = new Date("2025-07-01T00:00:00Z");
const mockClock: Clock = { now: vi.fn(() => NOW) };
const mockIdGen: IdGenerator = {
  newId: vi.fn(() => "xpe_01"),
  paymentRef: vi.fn(() => "x"),
  receiptNumber: vi.fn(() => "x"),
};

function makeXPEventRepo(): IXPEventRepository {
  return {
    create: vi.fn(async (e: XPEvent) => Result.ok(e)),
    findByUserId: vi.fn(),
  };
}

function makeUser(
  totalXp: number = 0,
): User & { updateTotalXp: (xp: number) => Promise<Result<User>> } {
  return {
    id: USER_ID,
    email: "student@example.com",
    name: "Test Student",
    passwordHash: "hashed",
    emailVerified: true,
    verificationToken: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    createdAt: NOW,
    totalXp,
    updateTotalXp: vi.fn(async (xp: number) =>
      Result.ok({ ...makeUser(totalXp + xp) }),
    ) as never,
  };
}

function makeUserRepo(user: User | null): IUserRepository {
  return {
    findById: vi.fn(async (id: string) =>
      id === user?.id ? Result.ok(user) : Result.err({ kind: "not_found" }),
    ) as IUserRepository["findById"],
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateTotalXp: user?.updateTotalXp ?? vi.fn(),
  };
}

describe("AwardXP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards XP and returns new total", async () => {
    const user = makeUser(0);
    const xpEventRepo = makeXPEventRepo();
    const userRepo = makeUserRepo(user);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({ userId: USER_ID, amount: 10, reason: "lesson_completed" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.xpEvent.amount).toBe(10);
    expect(result.value.xpEvent.reason).toBe("lesson_completed");
    expect(result.value.totalXp).toBe(10);
    expect(xpEventRepo.create).toHaveBeenCalledOnce();
    expect((user.updateTotalXp as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("accumulates XP over multiple awards", async () => {
    const user = makeUser(90); // already has 90 XP
    const xpEventRepo = makeXPEventRepo();
    const userRepo = makeUserRepo(user);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({ userId: USER_ID, amount: 10, reason: "lesson_completed" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalXp).toBe(100); // 90 + 10
  });

  it("returns user_not_found when user does not exist", async () => {
    const xpEventRepo = makeXPEventRepo();
    const userRepo = makeUserRepo(null);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({ userId: "ghost_user", amount: 10, reason: "lesson_completed" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("user_not_found");
  });

  it("returns invalid_amount when amount is 0", async () => {
    const user = makeUser(0);
    const xpEventRepo = makeXPEventRepo();
    const userRepo = makeUserRepo(user);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({ userId: USER_ID, amount: 0, reason: "lesson_completed" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_amount");
  });

  it("returns invalid_amount when amount is negative", async () => {
    const user = makeUser(0);
    const xpEventRepo = makeXPEventRepo();
    const userRepo = makeUserRepo(user);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({ userId: USER_ID, amount: -5, reason: "lesson_completed" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_amount");
  });

  it("returns invalid_reason when reason is unknown", async () => {
    const user = makeUser(0);
    const xpEventRepo = makeXPEventRepo();
    const userRepo = makeUserRepo(user);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({ userId: USER_ID, amount: 10, reason: "unknown_action" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_reason");
  });

  it("returns db_error when xpEventRepo.create fails", async () => {
    const user = makeUser(0);
    const xpEventRepo: IXPEventRepository = {
      create: vi.fn(async () => Result.err({ kind: "db_error", message: "DB error" })),
      findByUserId: vi.fn(),
    };
    const userRepo = makeUserRepo(user);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({ userId: USER_ID, amount: 10, reason: "lesson_completed" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("accepts optional refId", async () => {
    const user = makeUser(0);
    const xpEventRepo = makeXPEventRepo();
    const userRepo = makeUserRepo(user);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({
      userId: USER_ID,
      amount: 50,
      reason: "course_completed",
      refId: "course_01",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.xpEvent.refId).toBe("course_01");
  });

  it("awards course completion bonus (50 XP)", async () => {
    const user = makeUser(0);
    const xpEventRepo = makeXPEventRepo();
    const userRepo = makeUserRepo(user);

    const useCase = new AwardXP({ xpEventRepo, userRepo, idGen: mockIdGen, clock: mockClock });
    const result = await useCase.execute({ userId: USER_ID, amount: 50, reason: "course_completed", refId: "course_01" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.xpEvent.amount).toBe(50);
    expect(result.value.totalXp).toBe(50);
  });
});
