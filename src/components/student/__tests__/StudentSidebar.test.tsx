// @vitest-environment jsdom

/**
 * StudentSidebar — new-user "?" badge tests (STORY-129).
 *
 * The badge appears next to the Dashboard link when:
 *   - welcomeCompletedAt === null, AND
 *   - now - createdAt < 7 days
 *
 * The badge is an inline <Link> to /welcome that lets a returning
 * student reopen the tour. Pinning these three cases keeps the
 * freshness window honest and stops the badge from leaking to
 * established users.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.unmock("@/components/student/StudentSidebar");

import { StudentSidebar } from "../StudentSidebar";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("StudentSidebar new-user badge", () => {
  const NOW = new Date("2026-09-20T12:00:00Z");

  beforeEach(() => {
    mockUsePathname.mockReturnValue("/dashboard");
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a ? badge next to Dashboard for a fresh user (under 7 days, welcome not yet completed)", () => {
    render(
      <StudentSidebar
        user={{
          firstName: "Maria",
          lastName: "S",
          role: "STUDENT",
          welcomeCompletedAt: null,
          createdAt: new Date("2026-09-19T12:00:00Z"), // 1 day ago
        }}
      />,
    );

    const badge = screen.getByLabelText(/restart the welcome tour/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("href", "/welcome");
  });

  it("hides the badge when welcome is already complete", () => {
    render(
      <StudentSidebar
        user={{
          firstName: "Maria",
          lastName: "S",
          role: "STUDENT",
          welcomeCompletedAt: new Date("2026-09-18T00:00:00Z"),
          createdAt: new Date("2026-09-19T12:00:00Z"),
        }}
      />,
    );

    expect(screen.queryByLabelText(/restart the welcome tour/i)).not.toBeInTheDocument();
  });

  it("hides the badge after 7 days even if welcome is still incomplete", () => {
    render(
      <StudentSidebar
        user={{
          firstName: "Maria",
          lastName: "S",
          role: "STUDENT",
          welcomeCompletedAt: null,
          createdAt: new Date("2026-09-01T12:00:00Z"), // 19 days ago
        }}
      />,
    );

    expect(screen.queryByLabelText(/restart the welcome tour/i)).not.toBeInTheDocument();
  });
});
