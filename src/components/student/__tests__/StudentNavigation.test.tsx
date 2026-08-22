// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.unmock("@/components/student/StudentSidebar");

import { StudentSidebar } from "../StudentSidebar";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("StudentSidebar navigation", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/live-classes");
  });

  it("exposes live classes in the primary navigation", () => {
    render(
      <StudentSidebar
        user={{ firstName: "Ryan", lastName: "Dabao", role: "STUDENT" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Live classes" })).toHaveAttribute(
      "href",
      "/live-classes",
    );
    expect(screen.getByRole("link", { name: "Live classes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps course navigation active for nested lesson routes", () => {
    mockUsePathname.mockReturnValue("/courses/foundations/lessons/lesson-1");
    render(
      <StudentSidebar
        user={{ firstName: "Ryan", lastName: "Dabao", role: "STUDENT" }}
      />,
    );

    expect(screen.getByRole("link", { name: "My Courses" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
