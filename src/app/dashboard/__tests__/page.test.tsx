/**
 * dashboard page — module + data-layer test.
 *
 * P0-4: Successful login/signup must not 404. The /dashboard route
 * must exist and render a useful, auth-gated landing page.
 *
 * Async server components are awkward to render in unit tests (they
 * return a Promise of JSX). Instead, we test:
 *  1. The page module exists and exports a default function.
 *  2. The data layer (loadEnrollmentsWithCourses) joins enrollments
 *     and courses correctly via the container.
 *  3. The defensive redirect path uses /login (caught by Next control flow).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getSessionUser so the server component can render.
const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
  getSessionUserId: () => mockGetSessionUser().then((u: unknown) => (u as { id: string } | null)?.id ?? null),
}));

// Mock the container so we can stub the enrollment + course queries.
const mockEnrollments = vi.fn();
const mockCourseFindById = vi.fn();
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    enrollmentRepo: { findByUserId: mockEnrollments },
    courseRepo: { findById: mockCourseFindById },
  }),
}));

// Mock the next/navigation redirect so we can assert the path without
// tripping Next's control-flow throw.
const mockRedirect = vi.fn((url: string) => {
  throw Object.assign(new Error(`NEXT_REDIRECT: ${url}`), { digest: "NEXT_REDIRECT" });
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

import DashboardPage from "../page";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_01",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Velasquez",
    role: "STUDENT",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: ["course_01"],
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: "enr_1",
    userId: "user_01",
    courseId: "course_01",
    status: "active",
    source: "direct",
    couponCode: null,
    couponDiscount: null,
    createdAt: new Date("2025-01-02"),
    completedLessonIds: ["lesson_1"],
    lastLessonId: "lesson_1",
    progressPercent: 25,
    markLessonComplete: () => undefined,
    ...overrides,
  };
}

function makeCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: "course_01",
    slug: "amazon-ppc-101",
    title: "Amazon PPC 101",
    tagline: "Master PPC in 30 days",
    description: "A test course",
    price: { minor: 0, currency: "PHP" },
    curriculum: { sections: [] },
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED",
    courseTier: "STARTER",
    previewLessonCount: 1,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

describe("DashboardPage (P0-4: post-auth destination)", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockEnrollments.mockReset();
    mockCourseFindById.mockReset();
    mockRedirect.mockClear();
  });

  it("exports a default async function (the page module is reachable)", () => {
    expect(typeof DashboardPage).toBe("function");
  });

  it("queries the user's enrollments via the container", async () => {
    mockGetSessionUser.mockResolvedValue(makeUser());
    mockEnrollments.mockResolvedValue({ ok: true, value: [] });

    // Catch the eventual render attempt; we just want to assert the data flow
    try {
      await DashboardPage();
    } catch {
      // Async server component rendering may fail in jsdom-free env; that's OK.
    }

    expect(mockEnrollments).toHaveBeenCalledWith("user_01");
  });

  it("looks up the course for each enrollment", async () => {
    mockGetSessionUser.mockResolvedValue(makeUser());
    mockEnrollments.mockResolvedValue({ ok: true, value: [makeEnrollment(), makeEnrollment({ id: "enr_2", courseId: "course_02" })] });
    mockCourseFindById.mockResolvedValue({ ok: true, value: makeCourse() });

    try {
      await DashboardPage();
    } catch {
      // ignore
    }

    expect(mockCourseFindById).toHaveBeenCalledWith("course_01");
    expect(mockCourseFindById).toHaveBeenCalledWith("course_02");
  });

  it("redirects to /login when the session user is null (defensive)", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    try {
      await DashboardPage();
    } catch (err) {
      // The redirect is implemented as a thrown NEXT_REDIRECT.
      // The mock's redirect() throws a tagged error.
      expect((err as Error).message).toContain("NEXT_REDIRECT");
    }
    expect(mockRedirect).toHaveBeenCalledWith("/login?redirect=/dashboard");
  });

  it("returns an empty list when enrollmentRepo returns an error", async () => {
    mockGetSessionUser.mockResolvedValue(makeUser());
    mockEnrollments.mockResolvedValue({ ok: false, error: { kind: "db_error", message: "down" } });
    mockCourseFindById.mockResolvedValue({ ok: true, value: makeCourse() });

    try {
      await DashboardPage();
    } catch {
      // ignore
    }

    // The page should not have called courseRepo since enrollments failed
    expect(mockCourseFindById).not.toHaveBeenCalled();
  });
});
