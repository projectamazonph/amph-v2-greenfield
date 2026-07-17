import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { RecordStreakVisit } from "@/usecases/RecordStreakVisit";
import type { IUserStreakRepository } from "@/ports/repositories/IUserStreakRepository";
import type { AwardXP } from "@/usecases/AwardXP";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { UserStreak } from "@/domain/services/StreakService";

const USER_ID = "user_01";
const NOW = new Date("2025-07-01T00:00:00Z");
const mockClock: Clock = { now: vi.fn(() => NOW) };
const mockIdGen: IdGenerator = {
  newId: vi.fn(() => "xpe_01"),
  paymentRef: vi.fn(() => "x"),
  receiptNumber: vi.fn(() => "x"),
};

interface MockUserStreak extends UserStreak {
  _repo?: IUserStreakRepository;
}

function makeStreakRepo(streak: MockUserStreak | null): IUserStreakRepository {
  return {
    findByUserId: vi.fn(async () => Result.ok(streak)),
    upsert: vi.fn(async (s) => Result.ok(s)),
  };
}

function makeStreak(
  overrides: Partial<{
    currentStreak: number;
    longestStreak: number;
    lastVisitDate: Date | null;
  }> = {},
): MockUserStreak {
  return {
    id: "streak_01",
    userId: USER_ID,
    currentStreak: overrides.currentStreak ?? 1,
    longestStreak: overrides.longestStreak ?? 1,
    lastVisitDate: overrides.lastVisitDate ?? null,
    createdAt: NOW,
    updatedAt: NOW,
  } as MockUserStreak;
}

// Mock AwardXP
const mockAwardXp = vi.fn().mockResolvedValue(Result.ok({ xpEvent: {} as never, totalXp: 100 }));

describe("RecordStreakVisit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("first visit ever → streak = 1", async () => {
    const streakRepo = makeStreakRepo(null);
    const useCase = new RecordStreakVisit({
      streakRepo,
      awardXpExecute: mockAwardXp,
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, visitDate: NOW });

    if (!result.ok) throw new Error("FAIL: " + JSON.stringify(result.error));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentStreak).toBe(1);
    expect(result.value.longestStreak).toBe(1);
    expect(result.value.milestoneHit).toBeNull();
    expect(streakRepo.upsert).toHaveBeenCalledOnce();
  });

  it("consecutive day → streak increases", async () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    const streak = makeStreak({ currentStreak: 3, longestStreak: 5, lastVisitDate: yesterday });
    const streakRepo = makeStreakRepo(streak);
    const useCase = new RecordStreakVisit({
      streakRepo,
      awardXpExecute: mockAwardXp,
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, visitDate: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentStreak).toBe(4);
    expect(result.value.longestStreak).toBe(5);
  });

  it("same day revisit → no change", async () => {
    const streak = makeStreak({ currentStreak: 5, longestStreak: 10, lastVisitDate: NOW });
    const streakRepo = makeStreakRepo(streak);
    const useCase = new RecordStreakVisit({
      streakRepo,
      awardXpExecute: mockAwardXp,
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, visitDate: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentStreak).toBe(5);
    expect(result.value.longestStreak).toBe(10);
    expect(result.value.milestoneHit).toBeNull();
  });

  it("miss a day → streak resets to 1", async () => {
    const twoDaysAgo = new Date(NOW);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const streak = makeStreak({ currentStreak: 10, longestStreak: 20, lastVisitDate: twoDaysAgo });
    const streakRepo = makeStreakRepo(streak);
    const useCase = new RecordStreakVisit({
      streakRepo,
      awardXpExecute: mockAwardXp,
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, visitDate: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentStreak).toBe(1);
    expect(result.value.longestStreak).toBe(20); // longest preserved
  });

  it("hit 7-day milestone → calls awardXp with streak_bonus", async () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    const streak = makeStreak({ currentStreak: 6, longestStreak: 6, lastVisitDate: yesterday });
    const streakRepo = makeStreakRepo(streak);
    const useCase = new RecordStreakVisit({
      streakRepo,
      awardXpExecute: mockAwardXp,
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, visitDate: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentStreak).toBe(7);
    expect(result.value.milestoneHit).not.toBeNull();
    expect(mockAwardXp).toHaveBeenCalledWith({
      userId: USER_ID,
      amount: 25,
      reason: "streak_bonus",
    });
  });

  it("longest streak updated when current exceeds it", async () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    const streak = makeStreak({ currentStreak: 5, longestStreak: 5, lastVisitDate: yesterday });
    const streakRepo = makeStreakRepo(streak);
    const useCase = new RecordStreakVisit({
      streakRepo,
      awardXpExecute: mockAwardXp,
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, visitDate: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentStreak).toBe(6);
    expect(result.value.longestStreak).toBe(6);
  });

  it("calls upsert with updated streak data", async () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    const streak = makeStreak({ currentStreak: 6, longestStreak: 6, lastVisitDate: yesterday });
    const streakRepo = makeStreakRepo(streak);
    const useCase = new RecordStreakVisit({
      streakRepo,
      awardXpExecute: mockAwardXp,
      idGen: mockIdGen,
      clock: mockClock,
    });

    await useCase.execute({ userId: USER_ID, visitDate: NOW });

    const upsertCall = (streakRepo.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(upsertCall.userId).toBe(USER_ID);
    expect(upsertCall.currentStreak).toBe(7);
    expect(upsertCall.longestStreak).toBe(7);
  });

  it("db error from upsert returns error result", async () => {
    // Use yesterday's date so the visit actually triggers an upsert
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    const streak = makeStreak({ currentStreak: 1, longestStreak: 1, lastVisitDate: yesterday });
    const streakRepo: IUserStreakRepository = {
      findByUserId: async () => Result.ok(streak),
      upsert: vi.fn(async () => Result.err({ kind: "db_error" as const, message: "DB error" })),
    };
    const useCase = new RecordStreakVisit({
      streakRepo,
      awardXpExecute: mockAwardXp,
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, visitDate: NOW });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});
