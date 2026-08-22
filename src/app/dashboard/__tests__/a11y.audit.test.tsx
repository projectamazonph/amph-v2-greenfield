// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import "vitest-axe/extend-expect";

import { render } from "@testing-library/react";
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

function makeEnrollment() {
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
});
