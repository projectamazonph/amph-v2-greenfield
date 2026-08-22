// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import "vitest-axe/extend-expect";

import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAuth = vi.fn();
const mockGetSessionUser = vi.fn();
const mockFindByUserId = vi.fn();
const mockFindCourseById = vi.fn();
const mockFindEnrollment = vi.fn();

vi.mock("@/components/student/StudentShell", () => ({
  StudentShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: () => mockRequireAuth(),
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("@/components/profile/ExportDataButton", () => ({
  ExportDataButton: ({ className }: { className?: string }) => (
    <button type="button" className={className}>
      Download data
    </button>
  ),
}));

vi.mock("@/app/actions/deleteAccount.action", () => ({
  deleteAccountAction: vi.fn(),
}));

vi.mock("@/app/actions/studentTwoFactor.action", () => ({
  disableStudentTwoFactorAction: vi.fn(),
  enableStudentTwoFactorAction: vi.fn(),
}));

vi.mock("@/app/actions/requestRefund.action", () => ({
  requestRefundAction: vi.fn(),
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    orderRepo: { findByUserId: mockFindByUserId },
    courseRepo: { findById: mockFindCourseById },
    enrollmentRepo: { findByUserIdAndCourseId: mockFindEnrollment },
  }),
}));

import ProfileDataPage from "../data/page";
import PurchasesPage from "../purchases/page";
import StudentSecurityPage from "../security/page";

function makeUser(overrides: Record<string, unknown> = {}) {
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
    twoFactorEnabled: false,
    ...overrides,
  };
}

describe("student profile subroutes accessibility", () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockGetSessionUser.mockReset();
    mockFindByUserId.mockReset();
    mockFindCourseById.mockReset();
    mockFindEnrollment.mockReset();
    mockRequireAuth.mockResolvedValue(makeUser());
    mockGetSessionUser.mockResolvedValue(makeUser());
    mockFindByUserId.mockResolvedValue({ ok: true, value: [] });
  });

  it("has no axe violations on the data page", async () => {
    const { container } = render(await ProfileDataPage({ searchParams: Promise.resolve({}) }));

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations when security is enabled", async () => {
    mockRequireAuth.mockResolvedValue(makeUser({ twoFactorEnabled: true }));
    const { container } = render(
      await StudentSecurityPage({ searchParams: Promise.resolve({ "2fa": "enabled" }) }),
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations in the empty purchases state", async () => {
    const { container } = render(await PurchasesPage({ searchParams: Promise.resolve({}) }));

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations for a paid purchase with a refund form", async () => {
    const createdAt = new Date("2026-08-20T08:00:00.000Z");
    mockFindByUserId.mockResolvedValue({
      ok: true,
      value: [
        {
          id: "order_01",
          courseId: "course_01",
          status: "PAID",
          totalMinor: 9900,
          currency: "PHP",
          createdAt,
          paymongoPaidAt: createdAt,
          refundRequestedAt: null,
          refundProcessedAt: null,
        },
      ],
    });
    mockFindCourseById.mockResolvedValue({ ok: true, value: { title: "Amazon PPC Foundations" } });
    mockFindEnrollment.mockResolvedValue({ progressPercent: 10 });

    const { container } = render(await PurchasesPage({ searchParams: Promise.resolve({}) }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
