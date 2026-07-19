/**
 * AwardBadge use case tests — TDD (red first).
 *
 * STORY-035: Badge system.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AwardBadge } from "@/usecases/AwardBadge";
import { AwardXP } from "@/usecases/AwardXP";
import { createBadge } from "@/domain/entities/Badge";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";
import type { BadgeAward } from "@/domain/entities/BadgeAward";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";

const USER_ID = "user_01";
const NOW = new Date("2025-07-01T00:00:00Z");

function makeBadge(params: Partial<Badge> & { slug: BadgeSlug }): Badge {
  const r = createBadge({
    slug: params.slug,
    name: params.name ?? "Test Badge",
    description: params.description ?? "A test badge",
    iconName: params.iconName ?? "Trophy",
    xpReward: params.xpReward ?? 10,
  });
  if (!r.ok) throw new Error("Badge fixture creation failed");
  return r.value;
}

function buildBadgeRepo(findBySlugResult: { ok: boolean; value: Badge | null }): IBadgeRepository {
  return {
    findBySlug: vi.fn(async () => findBySlugResult) as IBadgeRepository["findBySlug"],
    findAll: vi.fn(async () => ({ ok: true, value: [] })) as IBadgeRepository["findAll"],
    create: vi.fn() as IBadgeRepository["create"],
    update: vi.fn() as IBadgeRepository["update"],
    archive: vi.fn() as IBadgeRepository["archive"],
  };
}

function buildBadgeAwardRepo(
  existsResult: { ok: boolean; value: boolean },
  createResult: { ok: boolean; value: BadgeAward },
): IBadgeAwardRepository {
  return {
    create: vi.fn(async () => createResult) as IBadgeAwardRepository["create"],
    findByUserId: vi.fn(async () => ({
      ok: true,
      value: [],
    })) as IBadgeAwardRepository["findByUserId"],
    exists: vi.fn(async () => existsResult) as IBadgeAwardRepository["exists"],
  };
}

// Mock AwardXP instance — cast to any so we can call .mock*() on execute
const mockAwardXp: AwardXP & {
  execute: ReturnType<typeof vi.fn>;
} = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: vi.fn() as any,
} as AwardXP & { execute: ReturnType<typeof vi.fn> };

function buildUseCase(badgeRepo: IBadgeRepository, badgeAwardRepo: IBadgeAwardRepository) {
  return new AwardBadge({
    badgeRepo,
    badgeAwardRepo,
    awardXp: mockAwardXp,
    idGen: {
      newId: () => "award_test_01",
      paymentRef: () => "pref_test_01",
      receiptNumber: () => "rct_test_01",
    },
  });
}

describe("AwardBadge", () => {
  beforeEach(() => {
    mockAwardXp.execute.mockClear();
    mockAwardXp.execute.mockResolvedValue({
      ok: true,
      value: { xpEvent: null as unknown, totalXp: 25 },
    });
  });

  it("awards a badge and returns xpAwarded", async () => {
    const badge = makeBadge({ slug: "first-quiz-pass", xpReward: 25 });
    const badgeRepo = buildBadgeRepo({ ok: true, value: badge });
    const badgeAwardRepo = buildBadgeAwardRepo(
      { ok: true, value: false },
      {
        ok: true,
        value: {
          id: "award_test_01",
          userId: USER_ID,
          badgeSlug: "first-quiz-pass",
          awardedAt: NOW,
        },
      },
    );

    const useCase = buildUseCase(badgeRepo, badgeAwardRepo);
    const result = await useCase.execute({ userId: USER_ID, badgeSlug: "first-quiz-pass" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.xpAwarded).toBe(25);
    expect(result.value.badgeAward.badgeSlug).toBe("first-quiz-pass");
    expect(result.value.badgeAward.userId).toBe(USER_ID);
    expect(badgeAwardRepo.create).toHaveBeenCalledOnce();
    expect(mockAwardXp.execute).toHaveBeenCalledWith({
      userId: USER_ID,
      amount: 25,
      reason: "badge_awarded",
      refId: "award_test_01",
    });
  });

  it("returns badge_not_found when the badge does not exist", async () => {
    const badgeRepo = buildBadgeRepo({ ok: true, value: null });
    const badgeAwardRepo = buildBadgeAwardRepo(
      { ok: true, value: false },
      {
        ok: true,
        value: { id: "award_02", userId: USER_ID, badgeSlug: "first-quiz-pass", awardedAt: NOW },
      },
    );

    const useCase = buildUseCase(badgeRepo, badgeAwardRepo);
    const result = await useCase.execute({ userId: USER_ID, badgeSlug: "first-quiz-pass" });

    expect(result).toEqual({ ok: false, error: { kind: "badge_not_found" } });
  });

  it("returns already_awarded when the user already has the badge", async () => {
    const badge = makeBadge({ slug: "first-quiz-pass" });
    const badgeRepo = buildBadgeRepo({ ok: true, value: badge });
    const badgeAwardRepo = buildBadgeAwardRepo(
      { ok: true, value: true },
      {
        ok: true,
        value: { id: "award_02", userId: USER_ID, badgeSlug: "first-quiz-pass", awardedAt: NOW },
      },
    );

    const useCase = buildUseCase(badgeRepo, badgeAwardRepo);
    const result = await useCase.execute({ userId: USER_ID, badgeSlug: "first-quiz-pass" });

    expect(result).toEqual({
      ok: false,
      error: { kind: "already_awarded", badgeSlug: "first-quiz-pass" },
    });
    expect(badgeAwardRepo.create).not.toHaveBeenCalled();
  });

  it("awards 0 XP and skips awardXp.execute when the badge has no xpReward", async () => {
    const badge = makeBadge({ slug: "5-day-streak", xpReward: 0 });
    const badgeRepo = buildBadgeRepo({ ok: true, value: badge });
    const badgeAwardRepo = buildBadgeAwardRepo(
      { ok: true, value: false },
      {
        ok: true,
        value: { id: "award_01", userId: USER_ID, badgeSlug: "5-day-streak", awardedAt: NOW },
      },
    );

    const useCase = buildUseCase(badgeRepo, badgeAwardRepo);
    const result = await useCase.execute({ userId: USER_ID, badgeSlug: "5-day-streak" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.xpAwarded).toBe(0);
    expect(mockAwardXp.execute).not.toHaveBeenCalled();
  });

  it("does not fail the request when XP award fails (fire-and-forget)", async () => {
    const badge = makeBadge({ slug: "first-quiz-pass", xpReward: 25 });
    const badgeRepo = buildBadgeRepo({ ok: true, value: badge });
    const badgeAwardRepo = buildBadgeAwardRepo(
      { ok: true, value: false },
      {
        ok: true,
        value: { id: "award_01", userId: USER_ID, badgeSlug: "first-quiz-pass", awardedAt: NOW },
      },
    );
    mockAwardXp.execute.mockRejectedValue(new Error("XP service down"));

    const useCase = buildUseCase(badgeRepo, badgeAwardRepo);
    const result = await useCase.execute({ userId: USER_ID, badgeSlug: "first-quiz-pass" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.badgeAward.badgeSlug).toBe("first-quiz-pass");
  });
});
