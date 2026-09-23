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
const mockListOAuthLinks = vi.fn();

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
    oauthAccountRepo: { listByUser: mockListOAuthLinks },
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
    mockListOAuthLinks.mockReset();
    mockRequireAuth.mockResolvedValue(makeUser());
    mockGetSessionUser.mockResolvedValue(makeUser());
    mockFindByUserId.mockResolvedValue({ ok: true, value: [] });
    mockListOAuthLinks.mockResolvedValue({ ok: true, value: [] });
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

  // STORY-162 · profile/security surface
  describe("STORY-162 · profile/security surface", () => {
    it("renders the account-at-a-glance summary with the operator's email", async () => {
      mockRequireAuth.mockResolvedValue(
        makeUser({ email: "student@example.com", emailVerifiedAt: new Date("2025-01-01") }),
      );
      const { container } = render(
        await StudentSecurityPage({ searchParams: Promise.resolve({}) }),
      );

      expect(container.textContent).toContain("student@example.com");
      expect(container.textContent).toContain("Signed-in email");
      expect(container.textContent).toContain("Verified by AMPH");
    });

    it("uses the enabled badge variant when two-factor is on", async () => {
      mockRequireAuth.mockResolvedValue(makeUser({ twoFactorEnabled: true }));
      const { container } = render(
        await StudentSecurityPage({ searchParams: Promise.resolve({}) }),
      );

      // Two "Enabled" hits: one in the at-a-glance summary cell, one
      // below the H2. Both must render with the green-tinted hashed
      // CSS-module class. We match on the suffix so the test survives
      // CSS-module hash renames.
      const enabledCells = Array.from(container.querySelectorAll("span")).filter(
        (el) => el.textContent === "Enabled",
      );
      expect(enabledCells.length).toBeGreaterThanOrEqual(2);
      const anyEnabledClass = enabledCells.some((el) =>
        Array.from(el.classList).some((c) => c.includes("statusBadgeEnabled")),
      );
      expect(anyEnabledClass).toBe(true);
    });

    it("uses the disabled badge variant when two-factor is off", async () => {
      mockRequireAuth.mockResolvedValue(makeUser({ twoFactorEnabled: false }));
      const { container } = render(
        await StudentSecurityPage({ searchParams: Promise.resolve({}) }),
      );

      const disabledCells = Array.from(container.querySelectorAll("span")).filter(
        (el) => el.textContent === "Disabled",
      );
      expect(disabledCells.length).toBeGreaterThanOrEqual(2);
      const anyDisabledClass = disabledCells.some((el) =>
        Array.from(el.classList).some((c) => c.includes("statusBadgeDisabled")),
      );
      expect(anyDisabledClass).toBe(true);
    });

    it("renders the Connected accounts count in the at-a-glance summary", async () => {
      mockListOAuthLinks.mockResolvedValue({
        ok: true,
        value: [
          { provider: "google", userId: "user_01", providerAccountId: "p_01" },
          { provider: "github", userId: "user_01", providerAccountId: "p_02" },
        ],
      });
      const { container } = render(
        await StudentSecurityPage({ searchParams: Promise.resolve({}) }),
      );

      // Count renders as a bare number "2" inside the cell, and the
      // summary line below says "2 sign-in methods linked".
      expect(container.textContent).toContain("2");
      expect(container.textContent).toContain("2 sign-in methods linked");
    });

    it("attaches a data-confirm to OAuth Remove buttons for wired-up confirm UIs", async () => {
      mockListOAuthLinks.mockResolvedValue({
        ok: true,
        value: [{ provider: "google", userId: "user_01", providerAccountId: "p_01" }],
      });
      const { container } = render(
        await StudentSecurityPage({ searchParams: Promise.resolve({}) }),
      );

      const removeButtons = Array.from(container.querySelectorAll("button")).filter(
        (btn) => btn.textContent === "Remove",
      );
      expect(removeButtons.length).toBe(1);
      const dataConfirm = removeButtons[0]?.getAttribute("data-confirm");
      expect(dataConfirm).toMatch(/Remove Google sign-in\?/);
    });
  });
});
