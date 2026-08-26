import { Result } from "@/domain/shared/Result";
import { AwardXP } from "@/usecases/AwardXP";
import type { IXPAwardRepository, XPAwardCommand } from "@/ports/repositories/IXPAwardRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { XPEvent } from "@/domain/entities/XPEvent";

const USER_ID = "user_01";
const NOW = new Date("2025-07-01T00:00:00Z");
const mockClock: Clock = { now: vi.fn(() => NOW) };
const mockIdGen: IdGenerator = {
  newId: vi.fn(() => "xpe_01"),
  paymentRef: vi.fn(() => "x"),
  receiptNumber: vi.fn(() => "x"),
};

function makeEvent(command: XPAwardCommand, totalXp = command.event.amount): XPEvent {
  return command.event;
}

function makeRepo(
  handler: (command: XPAwardCommand) => ReturnType<IXPAwardRepository["award"]>,
): IXPAwardRepository {
  return { award: vi.fn(handler) };
}

describe("AwardXP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards XP through the atomic repository and returns the new total", async () => {
    const repo = makeRepo(async (command) =>
      Result.ok({ event: makeEvent(command), totalXp: 10, applied: true }),
    );
    const useCase = new AwardXP({ xpAwardRepo: repo, idGen: mockIdGen, clock: mockClock });

    const result = await useCase.execute({
      userId: USER_ID,
      amount: 10,
      reason: "lesson_completed",
      idempotencyKey: "lesson_completed:user_01:lesson_01",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.xpEvent.amount).toBe(10);
    expect(result.value.totalXp).toBe(10);
    expect(result.value.applied).toBe(true);
    expect(repo.award).toHaveBeenCalledOnce();
    expect(repo.award).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "lesson_completed:user_01:lesson_01" }),
    );
  });

  it("returns an existing award without applying XP twice", async () => {
    const repo = makeRepo(async (command) =>
      Result.ok({ event: makeEvent(command, 100), totalXp: 100, applied: false }),
    );
    const useCase = new AwardXP({ xpAwardRepo: repo, idGen: mockIdGen, clock: mockClock });

    const result = await useCase.execute({
      userId: USER_ID,
      amount: 10,
      reason: "lesson_completed",
      idempotencyKey: "lesson_completed:user_01:lesson_01",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.applied).toBe(false);
      expect(result.value.totalXp).toBe(100);
    }
  });

  it("maps a missing user from the atomic repository", async () => {
    const repo = makeRepo(async () => Result.err({ kind: "user_not_found" as const }));
    const useCase = new AwardXP({ xpAwardRepo: repo, idGen: mockIdGen, clock: mockClock });

    const result = await useCase.execute({
      userId: "ghost_user",
      amount: 10,
      reason: "lesson_completed",
      idempotencyKey: "lesson_completed:ghost_user:lesson_01",
    });

    expect(result).toEqual({ ok: false, error: { kind: "user_not_found" } });
  });

  it("rejects invalid amounts", async () => {
    const repo = makeRepo(async () => {
      throw new Error("must not be called");
    });
    const useCase = new AwardXP({ xpAwardRepo: repo, idGen: mockIdGen, clock: mockClock });

    const result = await useCase.execute({
      userId: USER_ID,
      amount: 0,
      reason: "lesson_completed",
      idempotencyKey: "lesson_completed:user_01:lesson_01",
    });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_amount" } });
    expect(repo.award).not.toHaveBeenCalled();
  });

  it("rejects unknown reasons", async () => {
    const repo = makeRepo(async () => {
      throw new Error("must not be called");
    });
    const useCase = new AwardXP({ xpAwardRepo: repo, idGen: mockIdGen, clock: mockClock });

    const result = await useCase.execute({
      userId: USER_ID,
      amount: 10,
      reason: "unknown_action",
      idempotencyKey: "unknown:user_01:1",
    });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_reason" } });
    expect(repo.award).not.toHaveBeenCalled();
  });

  it("rejects empty or oversized idempotency keys", async () => {
    const repo = makeRepo(async () => {
      throw new Error("must not be called");
    });
    const useCase = new AwardXP({ xpAwardRepo: repo, idGen: mockIdGen, clock: mockClock });

    const empty = await useCase.execute({
      userId: USER_ID,
      amount: 10,
      reason: "lesson_completed",
      idempotencyKey: " ",
    });
    const oversized = await useCase.execute({
      userId: USER_ID,
      amount: 10,
      reason: "lesson_completed",
      idempotencyKey: "x".repeat(201),
    });

    expect(empty).toEqual({ ok: false, error: { kind: "invalid_idempotency_key" } });
    expect(oversized).toEqual({ ok: false, error: { kind: "invalid_idempotency_key" } });
  });

  it("maps atomic repository failures to db_error", async () => {
    const repo = makeRepo(async () =>
      Result.err({ kind: "db_error" as const, message: "DB error" }),
    );
    const useCase = new AwardXP({ xpAwardRepo: repo, idGen: mockIdGen, clock: mockClock });

    const result = await useCase.execute({
      userId: USER_ID,
      amount: 10,
      reason: "lesson_completed",
      idempotencyKey: "lesson_completed:user_01:lesson_01",
    });

    expect(result).toEqual({ ok: false, error: { kind: "db_error", message: "DB error" } });
  });
});
