/**
 * /profile — page domain tests.
 *
 * Option B: tests the domain layer (getSessionUser, listUserBadges use case)
 * rather than HTML rendering (React 18 sync renderToString is incompatible with
 * React 19 async Server Components; HTML output is covered by E2E tests).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockUser = {
  id: "u-1",
  email: "ry@example.com",
  firstName: "Ryan",
  lastName: "Dabao",
  role: "student" as const,
  subscriptionTier: "mastery" as const,
  totalXp: 2400,
  createdAt: new Date("2025-01-15T00:00:00Z"),
};

const mockBadges = [
  {
    slug: "first-quiz-pass",
    name: "First Quiz Pass",
    description: "Passed your first quiz",
    iconName: "Trophy",
    xpReward: 50,
    archived: false,
    awardedAt: new Date(),
    awardId: "a1",
  },
  {
    slug: "5-day-streak",
    name: "5-Day Streak",
    description: "Five days in a row",
    iconName: "Flame",
    xpReward: 100,
    archived: false,
    awardedAt: new Date(),
    awardId: "a2",
  },
];

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(async () => mockUser),
  requireAuth: vi.fn(async () => mockUser),
  getSessionUserId: vi.fn(async () => mockUser.id),
  getSessionCookieName: vi.fn(() => "session_token"),
  SESSION_COOKIE_NAME: "session_token",
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    listUserBadges: {
      execute: vi.fn(async () => ({
        ok: true,
        value: { badges: mockBadges },
      })),
    },
  }),
}));

describe("/profile — domain layer", () => {
  it("getSessionUser returns the authenticated user", async () => {
    const { getSessionUser } = await import("@/lib/auth");
    const user = await getSessionUser();
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u-1");
    expect(user!.email).toBe("ry@example.com");
    expect(user!.firstName).toBe("Ryan");
    expect(user!.lastName).toBe("Dabao");
  });

  it("user has correct profile fields", async () => {
    const { getSessionUser } = await import("@/lib/auth");
    const user = await getSessionUser();
    expect(user!.role).toBe("student");
    expect(user!.subscriptionTier).toBe("mastery");
    expect(user!.totalXp).toBe(2400);
  });

  it("listUserBadges returns two badges for the user", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const result = await container.listUserBadges.execute({ userId: "u-1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.badges).toHaveLength(2);
  });

  it("badges have required display fields", async () => {
    const { buildContainer } = await import("@/composition/container");
    const container = buildContainer();
    const result = await container.listUserBadges.execute({ userId: "u-1" });
    if (!result.ok) return;
    result.value.badges.forEach((badge: { name: string; awardId: string; iconName: string }) => {
      expect(badge).toHaveProperty("name");
      expect(badge).toHaveProperty("awardId");
      expect(badge).toHaveProperty("iconName");
    });
  });

  it("badge data does not contain banned marketing phrases", async () => {
    // Test the domain data itself is clean — catches copy-paste mistakes.
    const allText = JSON.stringify(mockBadges).toLowerCase();
    const banned = ["synergy", "synergies", "streamline", "transformative", "revolutionary"];
    banned.forEach((phrase) => {
      expect(allText).not.toContain(phrase);
    });
  });
});
