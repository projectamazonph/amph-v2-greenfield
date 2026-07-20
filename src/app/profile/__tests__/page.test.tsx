/**
 * /profile — page contract tests.
 *
 * Tests render the page with mocked user + badges and check
 * the page structure.
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

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(async () => mockUser),
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    listUserBadges: {
      execute: vi.fn(async () => ({
        ok: true,
        value: {
          badges: [
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
          ],
        },
      })),
    },
  }),
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import ProfilePage from "../page";

describe("/profile", () => {
  it("renders the user's name and email", async () => {
    const html = renderToString(await ProfilePage());
    // React splits adjacent text nodes with a comment marker; the
    // first and last name pieces are rendered separately.
    expect(html).toContain("Ryan");
    expect(html).toContain("Dabao");
    expect(html).toContain("ry@example.com");
  });

  it("renders the profile fields", async () => {
    const html = renderToString(await ProfilePage());
    expect(html).toContain("student");
    expect(html).toContain("mastery");
    expect(html).toContain("2400");
  });

  it("renders badges when the user has them", async () => {
    const html = renderToString(await ProfilePage());
    expect(html).toContain("First Quiz Pass");
    expect(html).toContain("5-Day Streak");
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(await ProfilePage());
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
