// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.unmock("@/components/student/StudentSidebar");

import { StudentSidebar } from "../StudentSidebar";

const mockUsePathname = vi.fn();
const mockUseRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockUseRouterPush }),
}));

// STORY-146: these nav tests pre-date the "?" badge; they assume a
// returning student who already completed the welcome tour so the
// badge stays out of the rendered tree.
const RETURNING_USER = {
  firstName: "Ryan",
  lastName: "Dabao",
  role: "STUDENT",
  welcomeCompletedAt: new Date("2026-01-15T12:00:00Z"),
  createdAt: new Date("2025-09-01T12:00:00Z"),
};

describe("StudentSidebar navigation", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/live-classes");
  });

  it("exposes live classes in the primary navigation", () => {
    render(<StudentSidebar user={RETURNING_USER} />);

    expect(screen.getByRole("link", { name: "Live classes" })).toHaveAttribute(
      "href",
      "/live-classes",
    );
    expect(screen.getByRole("link", { name: "Live classes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("exposes assignments under Learn", () => {
    render(<StudentSidebar user={RETURNING_USER} />);

    expect(screen.getByRole("link", { name: "Assignments" })).toHaveAttribute(
      "href",
      "/assignments",
    );
  });

  it("keeps course navigation active for nested lesson routes", () => {
    mockUsePathname.mockReturnValue("/courses/foundations/lessons/lesson-1");
    render(<StudentSidebar user={RETURNING_USER} />);

    expect(screen.getByRole("link", { name: "My Courses" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
