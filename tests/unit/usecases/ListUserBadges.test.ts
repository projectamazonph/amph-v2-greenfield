/**
 * ListUserBadges use case tests — TDD (red first).
 *
 * STORY-035: Badge system.
 */

import { describe, it, expect, vi } from "vitest";
import { ListUserBadges } from "@/usecases/ListUserBadges";
import { createBadge } from "@/domain/entities/Badge";
import type { Badge } from "@/domain/entities/Badge";
import type { BadgeAward } from "@/domain/entities/BadgeAward";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";

const USER_ID = "user_01";
const AWARD_AT = new Date("2025-07-01T00:00:00Z");

function makeBadge(slug: string, xpReward = 10): Badge {
  const r = createBadge({
    slug: slug as import("@/domain/entities/Badge").BadgeSlug,
    name: `Badge ${slug}`,
    description: `Description for ${slug}`,
    iconName: "Trophy",
    xpReward,
  });
  if (!r.ok) throw new Error(`Badge fixture creation failed for ${slug}`);
  return r.value;
}

function buildBadgeRepo(fixedBadges: Badge[]): IBadgeRepository {
  const map = new Map(fixedBadges.map((b) => [b.slug, b]));
  return {
    findBySlug: vi.fn(async (slug) => ({
      ok: true,
      value: map.get(slug) ?? null,
    })) as IBadgeRepository["findBySlug"],
    findAll: vi.fn(async () => ({ ok: true, value: fixedBadges })) as IBadgeRepository["findAll"],
    create: vi.fn() as IBadgeRepository["create"],
    update: vi.fn() as IBadgeRepository["update"],
    archive: vi.fn() as IBadgeRepository["archive"],
  };
}

function buildBadgeAwardRepo(awards: BadgeAward[]): IBadgeAwardRepository {
  return {
    create: vi.fn(async (award) => ({ ok: true, value: award })) as IBadgeAwardRepository["create"],
    findByUserId: vi.fn(async () => ({
      ok: true,
      // PrismaBadgeAwardRepository sorts by awardedAt desc — match that in the mock
      value: [...awards].sort((a, b) => b.awardedAt.getTime() - a.awardedAt.getTime()),
    })) as IBadgeAwardRepository["findByUserId"],
    exists: vi.fn(async (uid, slug) => ({
      ok: true,
      value: false,
    })) as IBadgeAwardRepository["exists"],
  };
}

describe("ListUserBadges", () => {
  it("returns an empty list when the user has no badges", async () => {
    const badgeRepo = buildBadgeRepo([]);
    const badgeAwardRepo = buildBadgeAwardRepo([]);

    const useCase = new ListUserBadges({ badgeRepo, badgeAwardRepo });
    const result = await useCase.execute({ userId: USER_ID });

    expect(result).toEqual({ ok: true, value: { badges: [] } });
  });

  it("returns the user's badges with awardedAt merged in", async () => {
    const badge1 = makeBadge("first-quiz-pass", 25);
    const badge2 = makeBadge("5-day-streak", 0);
    const badgeRepo = buildBadgeRepo([badge1, badge2]);

    const award1: BadgeAward = {
      id: "award_01",
      userId: USER_ID,
      badgeSlug: "first-quiz-pass",
      awardedAt: AWARD_AT,
    };
    const award2: BadgeAward = {
      id: "award_02",
      userId: USER_ID,
      badgeSlug: "5-day-streak",
      awardedAt: new Date("2025-07-02T00:00:00Z"),
    };
    const badgeAwardRepo = buildBadgeAwardRepo([award1, award2]);

    const useCase = new ListUserBadges({ badgeRepo, badgeAwardRepo });
    const result = await useCase.execute({ userId: USER_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.badges).toHaveLength(2);
    // Awards are returned newest first (findByUserId sorts by awardedAt desc)
    expect(result.value.badges[0]!.slug).toBe("5-day-streak");
    expect(result.value.badges[0]!.awardedAt).toBeInstanceOf(Date);
    expect(result.value.badges[1]!.slug).toBe("first-quiz-pass");
  });

  it("returns badges in order of most recently awarded first", async () => {
    const badge = makeBadge("first-quiz-pass");
    const badgeRepo = buildBadgeRepo([badge]);

    const awardOlder: BadgeAward = {
      id: "award_old",
      userId: USER_ID,
      badgeSlug: "first-quiz-pass",
      awardedAt: new Date("2025-06-01T00:00:00Z"),
    };
    const awardNewer: BadgeAward = {
      id: "award_new",
      userId: USER_ID,
      badgeSlug: "first-quiz-pass",
      awardedAt: new Date("2025-07-01T00:00:00Z"),
    };
    // findByUserId returns newest first
    const badgeAwardRepo = buildBadgeAwardRepo([awardNewer, awardOlder]);

    const useCase = new ListUserBadges({ badgeRepo, badgeAwardRepo });
    const result = await useCase.execute({ userId: USER_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.badges[0]?.awardId).toBe("award_new");
    expect(result.value.badges[1]?.awardId).toBe("award_old");
  });
});
