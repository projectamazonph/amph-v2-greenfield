// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import "vitest-axe/extend-expect";

import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAuth = vi.fn();
const mockListUserBadges = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    listUserBadges: { execute: mockListUserBadges },
  }),
}));

import ProfilePage from "../page";

function makeUser() {
  return {
    id: "user_01",
    email: "student@example.com",
    firstName: "Student",
    lastName: "Example",
    role: "STUDENT",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    totalXp: 120,
    createdAt: new Date("2025-01-01"),
  };
}

describe("student profile accessibility", () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockListUserBadges.mockReset();
    mockRequireAuth.mockResolvedValue(makeUser());
  });

  it("has no axe violations in the empty badge state", async () => {
    mockListUserBadges.mockResolvedValue({ ok: true, value: { badges: [] } });
    const { container } = render(await ProfilePage());

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations when badges and profile settings are present", async () => {
    mockListUserBadges.mockResolvedValue({
      ok: true,
      value: {
        badges: [
          {
            awardId: "award_01",
            slug: "first-course",
            name: "First course",
            description: "Completed your first course.",
            iconName: "Trophy",
          },
        ],
      },
    });
    const { container } = render(await ProfilePage());

    expect(await axe(container)).toHaveNoViolations();
  });
});
