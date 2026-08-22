// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import "vitest-axe/extend-expect";

import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { axe } from "vitest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/components/student/StudentSidebar");

const mockRequireAuth = vi.fn();
const mockEnrollments = vi.fn();
const mockCourseFindById = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    enrollmentRepo: { findByUserId: mockEnrollments },
    courseRepo: { findById: mockCourseFindById },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/dashboard",
}));

vi.mock("@/components/student/CourseCover", () => ({
  CourseCover: ({ title }: { title: string }) => <div aria-label={`${title} cover`} role="img" />,
}));

import DashboardPage from "../page";
import { StudentSidebar } from "@/components/student/StudentSidebar";

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
    createdAt: new Date("2025-01-01"),
  };
}

function makeCourse() {
  return {
    id: "course_01",
    slug: "ppc-foundations",
    title: "PPC Foundations",
    tagline: "Build a reliable operating model.",
    description: "A test course.",
    price: { minor: 0, currency: "PHP", formatted: "PHP 0" },
    curriculum: {
      sections: [
        {
          id: "section_01",
          title: "Foundations",
          lessons: [
            {
              id: "lesson_01",
              title: "Account structure",
              type: "TEXT",
              content: { type: "TEXT", body: "Body" },
            },
          ],
        },
      ],
    },
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED",
    courseTier: "STARTER",
    previewLessonCount: 1,
    createdAt: new Date("2025-01-01"),
  };
}

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: "enrollment_01",
    userId: "user_01",
    courseId: "course_01",
    status: "active",
    source: "direct",
    couponCode: null,
    couponDiscount: null,
    createdAt: new Date("2025-01-02"),
    completedLessonIds: [],
    lastLessonId: null,
    progressPercent: 0,
    ...overrides,
  };
}

describe("student dashboard accessibility audit", () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockEnrollments.mockReset();
    mockCourseFindById.mockReset();
    mockRequireAuth.mockResolvedValue(makeUser());
  });

  it("has no axe violations in the empty dashboard state", async () => {
    mockEnrollments.mockResolvedValue({ ok: true, value: [] });
    const { container } = render(await DashboardPage());

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the enrolled resume state", async () => {
    mockEnrollments.mockResolvedValue({ ok: true, value: [makeEnrollment()] });
    mockCourseFindById.mockResolvedValue({ ok: true, value: makeCourse() });
    const { container } = render(await DashboardPage());

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations when the real student sidebar is present", async () => {
    mockEnrollments.mockResolvedValue({ ok: true, value: [] });
    const dashboard = await DashboardPage();
    const { container } = render(
      <>
        <StudentSidebar user={makeUser()} />
        {dashboard}
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("exposes course progress as a named progressbar", async () => {
    mockEnrollments.mockResolvedValue({
      ok: true,
      value: [makeEnrollment({ progressPercent: 25 })],
    });
    mockCourseFindById.mockResolvedValue({ ok: true, value: makeCourse() });
    render(await DashboardPage());

    const progress = screen.getByRole("progressbar", {
      name: "PPC Foundations progress: 25% complete",
    });
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
    expect(progress).toHaveAttribute("aria-valuenow", "25");
  });

  it("keeps the dashboard contrast and motion contracts explicit", () => {
    const css = readFileSync(resolve(__dirname, "../page.module.css"), "utf8");
    expect(css).toMatch(/\.continueBtn\s*\{[\s\S]*?background:\s*var\(--accent\);[\s\S]*?color:\s*var\(--accent-ink\);/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.progressFill/);
  });

  it("documents reduced-motion coverage for the shared mobile navigation", () => {
    const sidebarCss = readFileSync(
      resolve(process.cwd(), "src/components/student/StudentSidebar.module.css"),
      "utf8",
    );
    const toggleCss = readFileSync(
      resolve(process.cwd(), "src/components/ui/MobileNavToggle.module.css"),
      "utf8",
    );
    expect(sidebarCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(toggleCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
